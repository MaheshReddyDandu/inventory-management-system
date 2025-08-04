from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, require_roles_and_product, get_current_user_product_id
from app.models.user import User
from app.schemas.organization import (
    OrganizationalUnitCreate, OrganizationalUnitUpdate, OrganizationalUnitResponse,
    UserAssignmentCreate, UserAssignmentUpdate, UserAssignmentResponse,
    OfficeLocationCreate, OfficeLocationUpdate, OfficeLocationResponse,
    AttendanceRuleCreate, AttendanceRuleUpdate, AttendanceRuleResponse,
    CheckInRequest, CheckOutRequest, AttendanceResponse,
    HierarchyNode, OrganizationStats
)
from app.services.organization_service import OrganizationService

router = APIRouter()

# Organizational Unit Endpoints
@router.post("/units", response_model=OrganizationalUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_organizational_unit(
    unit_data: OrganizationalUnitCreate,
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Create new organizational unit"""
    org_service = OrganizationService(db)
    unit = org_service.create_organizational_unit(unit_data)
    return unit

@router.get("/units")
async def get_organizational_units(
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all organizational units for current user's product"""
    org_service = OrganizationService(db)
    if unit_type:
        units = org_service.get_units_by_type(current_user.product_id, unit_type)
        return units
    else:
        # Return hierarchy tree when no unit_type specified
        tree = org_service.get_hierarchy_tree(current_user.product_id)
        return tree

@router.get("/units/hierarchy", response_model=List[HierarchyNode])
async def get_hierarchy_tree(
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organizational hierarchy tree"""
    org_service = OrganizationService(db)
    tree = org_service.get_hierarchy_tree(current_user.product_id, unit_type)
    return tree

@router.get("/units/{unit_id}", response_model=OrganizationalUnitResponse)
async def get_organizational_unit(
    unit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific organizational unit"""
    org_service = OrganizationService(db)
    unit = org_service.get_organizational_unit(unit_id, current_user.product_id)
    return unit

@router.put("/units/{unit_id}", response_model=OrganizationalUnitResponse)
async def update_organizational_unit(
    unit_id: int,
    unit_update: OrganizationalUnitUpdate,
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Update organizational unit"""
    org_service = OrganizationService(db)
    update_data = {k: v for k, v in unit_update.dict().items() if v is not None}
    unit = org_service.update_organizational_unit(unit_id, current_user.product_id, update_data)
    return unit

@router.delete("/units/{unit_id}")
async def delete_organizational_unit(
    unit_id: int,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    """Delete organizational unit (soft delete)"""
    org_service = OrganizationService(db)
    org_service.delete_organizational_unit(unit_id, current_user.product_id)
    return {"message": "Organizational unit deleted successfully"}

# User Assignment Endpoints
@router.post("/assignments", response_model=UserAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_user_to_unit(
    assignment_data: UserAssignmentCreate,
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Assign user to organizational unit"""
    org_service = OrganizationService(db)
    assignment = org_service.assign_user_to_unit(assignment_data)
    return assignment

@router.get("/assignments", response_model=List[UserAssignmentResponse])
async def get_all_assignments(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get all assignments for current user's product"""
    org_service = OrganizationService(db)
    assignments = org_service.get_all_assignments(current_user.product_id)
    return assignments

@router.get("/assignments/user/{user_id}", response_model=List[UserAssignmentResponse])
async def get_user_assignments(
    user_id: int,
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get all assignments for a specific user"""
    org_service = OrganizationService(db)
    assignments = org_service.get_user_assignments(user_id, current_user.product_id)
    return assignments

@router.get("/assignments/unit/{unit_id}", response_model=List[UserAssignmentResponse])
async def get_unit_users(
    unit_id: int,
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get all users assigned to a specific unit"""
    org_service = OrganizationService(db)
    assignments = org_service.get_unit_users(unit_id, current_user.product_id)
    return assignments

@router.get("/assignments/my", response_model=List[UserAssignmentResponse])
async def get_my_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's assignments"""
    org_service = OrganizationService(db)
    assignments = org_service.get_user_assignments(current_user.id, current_user.product_id)
    return assignments

# Office Location Endpoints
@router.post("/office-locations", response_model=OfficeLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_office_location(
    location_data: OfficeLocationCreate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    """Create office location"""
    org_service = OrganizationService(db)
    location = org_service.create_office_location(location_data)
    return location

@router.get("/office-locations", response_model=List[OfficeLocationResponse])
async def get_office_locations(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get all office locations for current user's product"""
    from app.models.organization import OfficeLocation
    locations = db.query(OfficeLocation).filter(
        OfficeLocation.product_id == current_user.product_id,
        OfficeLocation.is_active == True
    ).all()
    return locations

# Attendance Rule Endpoints
@router.post("/attendance-rules", response_model=AttendanceRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance_rule(
    rule_data: AttendanceRuleCreate,
    current_user: User = Depends(require_roles_and_product(["admin"])),
    db: Session = Depends(get_db)
):
    """Create attendance rule"""
    from app.models.organization import AttendanceRule
    
    # Set product_id from current user context
    rule_dict = rule_data.dict()
    rule_dict['product_id'] = current_user.product_id
    
    db_rule = AttendanceRule(**rule_dict)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/attendance-rules", response_model=List[AttendanceRuleResponse])
async def get_attendance_rules(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get all attendance rules for current user's product"""
    from app.models.organization import AttendanceRule
    rules = db.query(AttendanceRule).filter(
        AttendanceRule.product_id == current_user.product_id,
        AttendanceRule.is_active == True
    ).all()
    return rules

# Attendance Endpoints
@router.post("/attendance/check-in", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def check_in(
    check_in_data: CheckInRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark attendance check-in"""
    org_service = OrganizationService(db)
    attendance = org_service.check_in(current_user.id, current_user.product_id, check_in_data)
    return attendance

@router.post("/attendance/check-out", response_model=AttendanceResponse)
async def check_out(
    check_out_data: CheckOutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark attendance check-out"""
    org_service = OrganizationService(db)
    attendance = org_service.check_out(current_user.id, current_user.product_id, check_out_data)
    return attendance

@router.get("/attendance/my", response_model=List[AttendanceResponse])
async def get_my_attendance(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(50, ge=1, le=100, description="Number of records per page (max 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's attendance records with pagination"""
    org_service = OrganizationService(db)
    records = org_service.get_attendance_records_paginated(
        current_user.id, 
        current_user.product_id, 
        start_date, 
        end_date,
        page,
        limit
    )
    return records

@router.get("/attendance/today", response_model=List[AttendanceResponse])
async def get_today_attendance(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get today's attendance for all users (admin/manager only)"""
    org_service = OrganizationService(db)
    records = org_service.get_today_attendance(current_user.product_id)
    return records

@router.get("/attendance/unit/{unit_id}", response_model=List[AttendanceResponse])
async def get_unit_attendance(
    unit_id: int,
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get attendance records for a specific unit"""
    from app.models.organization import Attendance
    from sqlalchemy import func
    
    records = db.query(Attendance).filter(
        Attendance.organizational_unit_id == unit_id,
        Attendance.product_id == current_user.product_id,
        func.date(Attendance.check_in_time) >= start_date,
        func.date(Attendance.check_in_time) <= end_date
    ).order_by(Attendance.check_in_time.desc()).all()
    
    return records

# Statistics Endpoints
@router.get("/stats", response_model=OrganizationStats)
async def get_organization_stats(
    current_user: User = Depends(require_roles_and_product(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Get organization statistics"""
    from app.models.organization import OrganizationalUnit, UserAssignment, Attendance
    from app.models.user import User
    from sqlalchemy import func
    
    # Total units
    total_units = db.query(OrganizationalUnit).filter(
        OrganizationalUnit.product_id == current_user.product_id,
        OrganizationalUnit.is_active == True
    ).count()
    
    # Total users
    total_users = db.query(User).filter(
        User.product_id == current_user.product_id,
        User.is_active == True
    ).count()
    
    # Units by type
    units_by_type = db.query(
        OrganizationalUnit.unit_type,
        func.count(OrganizationalUnit.id)
    ).filter(
        OrganizationalUnit.product_id == current_user.product_id,
        OrganizationalUnit.is_active == True
    ).group_by(OrganizationalUnit.unit_type).all()
    
    units_by_type_dict = {unit_type: count for unit_type, count in units_by_type}
    
    # Active assignments
    active_assignments = db.query(UserAssignment).filter(
        UserAssignment.product_id == current_user.product_id,
        UserAssignment.is_active == True
    ).count()
    
    # Today's attendance
    today = date.today()
    today_attendance = db.query(Attendance).filter(
        Attendance.product_id == current_user.product_id,
        func.date(Attendance.check_in_time) == today
    ).count()
    
    return OrganizationStats(
        total_units=total_units,
        total_users=total_users,
        units_by_type=units_by_type_dict,
        active_assignments=active_assignments,
        today_attendance=today_attendance
    )

# Location Validation Endpoint
@router.post("/validate-location")
async def validate_location(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate if location is within office geofence"""
    org_service = OrganizationService(db)
    is_valid = org_service.validate_location(latitude, longitude, current_user.product_id)
    
    return {
        "is_valid": is_valid,
        "latitude": latitude,
        "longitude": longitude,
        "message": "Location is within office geofence" if is_valid else "Location is outside office geofence"
    } 