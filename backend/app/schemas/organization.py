from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# Organizational Unit Schemas
class OrganizationalUnitBase(BaseModel):
    name: str
    unit_type: str  # branch, client, department, project
    code: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = 0

class OrganizationalUnitCreate(OrganizationalUnitBase):
    product_id: str
    
    @validator('unit_type')
    def validate_unit_type(cls, v):
        allowed_types = ['branch', 'client', 'department', 'project']
        if v not in allowed_types:
            raise ValueError(f'unit_type must be one of: {allowed_types}')
        return v

class OrganizationalUnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class OrganizationalUnitResponse(OrganizationalUnitBase):
    id: int
    product_id: str
    hierarchy_path: str
    level: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    children_count: int = 0
    users_count: int = 0
    
    class Config:
        from_attributes = True

# User Assignment Schemas
class UserAssignmentBase(BaseModel):
    user_id: int
    organizational_unit_id: int
    role_in_unit: str
    is_primary: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class UserAssignmentCreate(UserAssignmentBase):
    product_id: str

class UserAssignmentUpdate(BaseModel):
    role_in_unit: Optional[str] = None
    is_primary: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class UserAssignmentResponse(UserAssignmentBase):
    id: int
    product_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Office Location Schemas
class OfficeLocationBase(BaseModel):
    location_name: str
    latitude: Decimal
    longitude: Decimal
    radius_meters: int = 100
    address: Optional[str] = None
    organizational_unit_id: Optional[int] = None

class OfficeLocationCreate(OfficeLocationBase):
    product_id: str

class OfficeLocationUpdate(BaseModel):
    location_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    radius_meters: Optional[int] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class OfficeLocationResponse(OfficeLocationBase):
    id: int
    product_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Attendance Rule Schemas
class AttendanceRuleBase(BaseModel):
    rule_name: str
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    late_threshold_minutes: int = 15
    half_day_threshold_hours: int = 4
    work_days: str = '1,2,3,4,5'  # Monday=1, Sunday=7
    organizational_unit_id: Optional[int] = None

class AttendanceRuleCreate(AttendanceRuleBase):
    product_id: Optional[str] = None  # Made optional since backend sets it from user context
    
    @validator('start_time', 'end_time')
    def validate_time_format(cls, v):
        try:
            hours, minutes = map(int, v.split(':'))
            if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                raise ValueError
        except:
            raise ValueError('Time must be in HH:MM format')
        return v

class AttendanceRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None
    half_day_threshold_hours: Optional[int] = None
    work_days: Optional[str] = None
    is_active: Optional[bool] = None

class AttendanceRuleResponse(AttendanceRuleBase):
    id: int
    product_id: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceBase(BaseModel):
    organizational_unit_id: Optional[int] = None
    notes: Optional[str] = None

class CheckInRequest(AttendanceBase):
    latitude: Decimal
    longitude: Decimal
    location_name: Optional[str] = None
    work_type: str = 'office'  # office, remote, client-site, travel
    
    @validator('work_type')
    def validate_work_type(cls, v):
        allowed_types = ['office', 'remote', 'client-site', 'travel']
        if v not in allowed_types:
            raise ValueError(f'work_type must be one of: {allowed_types}')
        return v

class CheckOutRequest(AttendanceBase):
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    location_name: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int
    product_id: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    check_in_latitude: Optional[Decimal] = None
    check_in_longitude: Optional[Decimal] = None
    check_out_latitude: Optional[Decimal] = None
    check_out_longitude: Optional[Decimal] = None
    location_name: Optional[str] = None
    attendance_status: str
    work_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Hierarchy Tree Response
class HierarchyNode(BaseModel):
    id: int
    name: str
    unit_type: str
    code: Optional[str] = None
    level: int
    children: List['HierarchyNode'] = []
    users_count: int = 0
    
    class Config:
        from_attributes = True

# Update forward reference
HierarchyNode.model_rebuild()

# Statistics Response
class OrganizationStats(BaseModel):
    total_units: int
    total_users: int
    units_by_type: dict
    active_assignments: int
    today_attendance: int 