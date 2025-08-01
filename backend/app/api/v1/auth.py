from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, require_roles, require_roles_and_product
from app.models.user import User, Role
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest, RoleResponse
)
from app.services.auth_service import AuthService
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LogoutRequest(BaseModel):
    refresh_token: str

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.create_user(user_data)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user, access_token, refresh_token = auth_service.authenticate_user(login_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )

@router.post("/refresh", response_model=dict)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    access_token, new_refresh_token = auth_service.refresh_access_token(refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/logout")
async def logout(
    request: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    auth_service.logout(current_user, "", request.refresh_token)
    
    return {"message": "Successfully logged out"}

@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    auth_service.create_password_reset_token(request.email, request.product_id)
    
    return {"message": "Password reset email sent if email exists"}

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    auth_service.reset_password(request.token, request.new_password)
    
    return {"message": "Password successfully reset"}

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    auth_service.change_password(current_user, request.old_password, request.new_password)
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    # Get users for the current user's product only
    users = db.query(User).filter(
        User.is_active == True,
        User.product_id == current_user.product_id
    ).all()
    return users 

# --- USER CRUD (Admin only) ---

class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    product_id: Optional[str] = None

@router.post("/admin/users", response_model=UserResponse)
async def admin_create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Ensure user is created for the same product as the admin
    user_data.product_id = current_user.product_id
    auth_service = AuthService(db)
    user = auth_service.create_user(user_data)
    return user

@router.put("/admin/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Ensure admin can only update users from the same product
    user = db.query(User).filter(
        User.id == user_id,
        User.product_id == current_user.product_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.email:
        user.email = user_update.email
    if user_update.first_name:
        user.first_name = user_update.first_name
    if user_update.last_name:
        user.last_name = user_update.last_name
    if user_update.password:
        from app.core.security import get_password_hash
        user.hashed_password = get_password_hash(user_update.password)
    if user_update.role_id:
        user.role_id = user_update.role_id
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.is_verified is not None:
        user.is_verified = user_update.is_verified
    if user_update.product_id:
        user.product_id = user_update.product_id
    db.commit()
    db.refresh(user)
    return user

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Ensure admin can only delete users from the same product
    user = db.query(User).filter(
        User.id == user_id,
        User.product_id == current_user.product_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

# --- ROLE CRUD (Admin only) ---

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Optional[str] = None  # JSON string

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/admin/roles", response_model=List[RoleResponse])
async def admin_list_roles(
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Get roles for the current user's product only
    roles = db.query(Role).filter(Role.product_id == current_user.product_id).all()
    return roles

@router.post("/admin/roles", response_model=RoleResponse)
async def admin_create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    role = Role(
        name=role_data.name,
        description=role_data.description,
        permissions=role_data.permissions,
        product_id=current_user.product_id
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.put("/admin/roles/{role_id}", response_model=RoleResponse)
async def admin_update_role(
    role_id: int,
    role_update: RoleUpdate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Ensure admin can only update roles from the same product
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.product_id == current_user.product_id
    ).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role_update.name:
        role.name = role_update.name
    if role_update.description:
        role.description = role_update.description
    if role_update.permissions is not None:
        role.permissions = role_update.permissions
    if role_update.is_active is not None:
        role.is_active = role_update.is_active
    db.commit()
    db.refresh(role)
    return role

@router.delete("/admin/roles/{role_id}")
async def admin_delete_role(
    role_id: int,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    # Ensure admin can only delete roles from the same product
    role = db.query(Role).filter(
        Role.id == role_id,
        Role.product_id == current_user.product_id
    ).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()
    return {"message": "Role deleted"} 