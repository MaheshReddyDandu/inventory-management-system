from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    username: Optional[str] = None
    product_id: Optional[str] = None

class UserAssignmentCreate(BaseModel):
    organizational_unit_id: int
    role_in_unit: str = "member"  # manager, member, lead, supervisor
    is_primary: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role_id: int = 1  # Default to admin role
    product_id: Optional[str] = None  # Optional - will be auto-generated if not provided
    organizational_assignments: Optional[List[UserAssignmentCreate]] = []  # New field for organizational assignments
    # username is not required from the client
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    product_id: Optional[str] = None  # Optional - will be found by email if not provided

class UserAssignmentResponse(BaseModel):
    id: int
    organizational_unit_id: int
    organizational_unit_name: str
    organizational_unit_type: str
    role_in_unit: str
    is_primary: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    uuid: str
    is_active: bool
    is_verified: bool
    role: 'RoleResponse'
    organizational_assignments: List[UserAssignmentResponse] = []
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr
    product_id: Optional[str] = None  # Optional - will be found by email if not provided

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v 

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    product_id: Optional[str] = None
    organizational_assignments: Optional[List[UserAssignmentCreate]] = None

class OrganizationalUnitOption(BaseModel):
    id: int
    name: str
    unit_type: str
    code: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True 