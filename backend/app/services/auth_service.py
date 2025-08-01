from datetime import datetime, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, Role, RefreshToken, PasswordReset
from app.schemas.user import UserCreate, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.database import redis_client
from app.core.config import settings
from app.core.tasks import send_verification_email, send_password_reset_email
from jose import JWTError, jwt
import uuid

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: UserCreate) -> User:
        # Auto-generate product_id if not provided
        if not user_data.product_id:
            import uuid
            user_data.product_id = str(uuid.uuid4())
        
        # Check if user already exists (by email and product_id)
        existing_user = self.db.query(User).filter(
            User.email == user_data.email,
            User.product_id == user_data.product_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered for this product"
            )
        
        # Check if this is the first user for this product (tenant)
        is_first_user = self.db.query(User).filter(User.product_id == user_data.product_id).first() is None
        
        # If first user, create default roles for the product
        if is_first_user:
            self._create_default_roles_for_product(user_data.product_id)
        
        # For first user, automatically assign admin role
        if is_first_user:
            role = self.db.query(Role).filter(
                Role.name == "admin",
                Role.product_id == user_data.product_id
            ).first()
        else:
            # Verify role exists for the product
            role = self.db.query(Role).filter(
                Role.id == user_data.role_id,
                Role.product_id == user_data.product_id
            ).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role for this product"
                )
        # Auto-generate username from first and last name (unique per product)
        base_username = f"{user_data.first_name.lower()}.{user_data.last_name.lower()}"
        username = base_username
        suffix = 1
        while self.db.query(User).filter(
            User.username == username,
            User.product_id == user_data.product_id
        ).first():
            username = f"{base_username}{suffix}"
            suffix += 1
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=username,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            product_id=user_data.product_id,
            role_id=role.id  # Use the found role's ID
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        # Send verification email
        verification_token = create_refresh_token()
        send_verification_email.delay(db_user.id, verification_token)
        return db_user

    def authenticate_user(self, login_data: UserLogin) -> Tuple[User, str, str]:
        # Find user by email (and product_id if provided)
        if login_data.product_id:
            user = self.db.query(User).filter(
                User.email == login_data.email,
                User.product_id == login_data.product_id
            ).first()
        else:
            # If no product_id provided, find user by email only
            user = self.db.query(User).filter(User.email == login_data.email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is deactivated"
            )
        
        # Check if user is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is temporarily locked"
            )
        
        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            # Increment login attempts
            user.login_attempts += 1
            
            # Lock account after 5 failed attempts
            if user.login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            
            self.db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Reset login attempts on successful login
        user.login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Create tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = self._create_refresh_token(user.id, user.product_id)
        
        return user, access_token, refresh_token

    def _create_refresh_token(self, user_id: int, product_id: str) -> str:
        # Clean up old refresh tokens
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.expires_at < datetime.utcnow()
        ).delete()
        
        # Create new refresh token
        refresh_token = create_refresh_token()
        db_refresh_token = RefreshToken(
            token=refresh_token,
            user_id=user_id,
            product_id=product_id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        self.db.add(db_refresh_token)
        self.db.commit()
        
        return refresh_token

    def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        # Verify refresh token
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check if refresh token exists and is not revoked
        db_refresh_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not db_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user
        user = self.db.query(User).filter(User.id == db_refresh_token.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = self._create_refresh_token(user.id, user.product_id)
        
        # Revoke old refresh token
        db_refresh_token.is_revoked = True
        self.db.commit()
        
        return access_token, new_refresh_token

    def logout(self, current_user: User, access_token: str, refresh_token: str):
        # Blacklist access token
        redis_client.setex(
            f"blacklist:{access_token}",
            settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "revoked"
        )
        
        # Revoke refresh token
        db_refresh_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token,
            RefreshToken.user_id == current_user.id
        ).first()
        
        if db_refresh_token:
            db_refresh_token.is_revoked = True
            self.db.commit()

    def create_password_reset_token(self, email: str, product_id: str = None) -> str:
        # Find user by email (and product_id if provided)
        if product_id:
            user = self.db.query(User).filter(
                User.email == email,
                User.product_id == product_id
            ).first()
        else:
            # If no product_id provided, find user by email only
            user = self.db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if email exists or not
            return "reset_token_sent"
        
        # Clean up old password reset tokens
        self.db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.expires_at < datetime.utcnow()
        ).delete()
        
        # Create new password reset token
        reset_token = create_refresh_token()
        db_reset_token = PasswordReset(
            token=reset_token,
            user_id=user.id,
            product_id=user.product_id,  # Use user's product_id
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        
        self.db.add(db_reset_token)
        self.db.commit()
        
        # Send password reset email
        send_password_reset_email.delay(user.id, reset_token)
        
        return reset_token

    def reset_password(self, token: str, new_password: str) -> bool:
        # Find password reset token
        db_reset_token = self.db.query(PasswordReset).filter(
            PasswordReset.token == token,
            PasswordReset.is_used == False,
            PasswordReset.expires_at > datetime.utcnow()
        ).first()
        
        if not db_reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Update user password
        user = self.db.query(User).filter(User.id == db_reset_token.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        user.hashed_password = get_password_hash(new_password)
        db_reset_token.is_used = True
        
        self.db.commit()
        
        return True 

    def change_password(self, user: User, old_password: str, new_password: str) -> bool:
        # Verify old password
        from app.core.security import verify_password, get_password_hash
        if not verify_password(old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old password is incorrect"
            )
        # Set new password
        user.hashed_password = get_password_hash(new_password)
        self.db.commit()
        return True
    
    def _create_default_roles_for_product(self, product_id: str):
        """Create default roles for a new product/tenant"""
        from app.models.user import Role
        
        # Check if roles already exist for this product
        existing_roles = self.db.query(Role).filter(Role.product_id == product_id).count()
        if existing_roles > 0:
            return
        
        # Create default roles for the product
        default_roles = [
            Role(
                name="admin",
                description="Administrator with full access",
                permissions='["read", "write", "delete", "admin"]',
                product_id=product_id
            ),
            Role(
                name="manager",
                description="Manager with limited admin access",
                permissions='["read", "write", "manage"]',
                product_id=product_id
            ),
            Role(
                name="user",
                description="Regular user",
                permissions='["read", "write"]',
                product_id=product_id
            )
        ]
        
        for role in default_roles:
            self.db.add(role)
        
        self.db.commit() 