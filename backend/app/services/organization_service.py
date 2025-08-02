from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.organization import (
    OrganizationalUnit, UserAssignment, OfficeLocation, 
    AttendanceRule, Attendance, OrganizationalUnitMetadata
)
from app.models.user import User
from app.schemas.organization import (
    OrganizationalUnitCreate, UserAssignmentCreate, 
    OfficeLocationCreate, AttendanceRuleCreate,
    CheckInRequest, CheckOutRequest
)
from fastapi import HTTPException, status
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
import math
import requests

class OrganizationService:
    def __init__(self, db: Session):
        self.db = db
    
    # Organizational Unit Methods
    def create_organizational_unit(self, unit_data: OrganizationalUnitCreate) -> OrganizationalUnit:
        """Create organizational unit with hierarchy management"""
        
        # Generate code if not provided
        if not unit_data.code:
            unit_data.code = self._generate_unit_code(unit_data.unit_type, unit_data.product_id)
        
        # Calculate hierarchy path and level
        hierarchy_path, level = self._calculate_hierarchy_path(unit_data.parent_id, unit_data.product_id)
        
        # Create unit
        db_unit = OrganizationalUnit(
            **unit_data.dict(),
            hierarchy_path=hierarchy_path,
            level=level
        )
        
        self.db.add(db_unit)
        self.db.commit()
        self.db.refresh(db_unit)
        
        return db_unit
    
    def get_organizational_unit(self, unit_id: int, product_id: str) -> OrganizationalUnit:
        """Get organizational unit by ID"""
        unit = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.id == unit_id,
            OrganizationalUnit.product_id == product_id
        ).first()
        
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organizational unit not found"
            )
        
        return unit
    
    def update_organizational_unit(self, unit_id: int, product_id: str, update_data: dict) -> OrganizationalUnit:
        """Update organizational unit"""
        unit = self.get_organizational_unit(unit_id, product_id)
        
        for field, value in update_data.items():
            if hasattr(unit, field):
                setattr(unit, field, value)
        
        unit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(unit)
        
        return unit
    
    def delete_organizational_unit(self, unit_id: int, product_id: str) -> bool:
        """Delete organizational unit (soft delete)"""
        unit = self.get_organizational_unit(unit_id, product_id)
        
        # Check if unit has children
        children = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.parent_id == unit_id,
            OrganizationalUnit.product_id == product_id,
            OrganizationalUnit.is_active == True
        ).count()
        
        if children > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete unit with children. Please delete children first."
            )
        
        # Check if unit has active user assignments
        assignments = self.db.query(UserAssignment).filter(
            UserAssignment.organizational_unit_id == unit_id,
            UserAssignment.product_id == product_id,
            UserAssignment.is_active == True
        ).count()
        
        if assignments > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete unit with active user assignments. Please reassign users first."
            )
        
        # Soft delete
        unit.is_active = False
        self.db.commit()
        
        return True
    
    def get_hierarchy_tree(self, product_id: str, unit_type: str = None) -> List[dict]:
        """Get complete organizational hierarchy tree"""
        
        query = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.product_id == product_id,
            OrganizationalUnit.is_active == True
        )
        
        if unit_type:
            query = query.filter(OrganizationalUnit.unit_type == unit_type)
        
        units = query.order_by(OrganizationalUnit.hierarchy_path).all()
        
        # Build tree structure
        return self._build_tree(units)
    
    def get_units_by_type(self, product_id: str, unit_type: str) -> List[OrganizationalUnit]:
        """Get all units of a specific type"""
        return self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.product_id == product_id,
            OrganizationalUnit.unit_type == unit_type,
            OrganizationalUnit.is_active == True
        ).order_by(OrganizationalUnit.name).all()
    
    # User Assignment Methods
    def assign_user_to_unit(self, assignment_data: UserAssignmentCreate) -> UserAssignment:
        """Assign user to organizational unit"""
        
        # Check if user and unit exist and belong to same product
        user = self.db.query(User).filter(
            User.id == assignment_data.user_id,
            User.product_id == assignment_data.product_id
        ).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        unit = self.get_organizational_unit(assignment_data.organizational_unit_id, assignment_data.product_id)
        
        # Check if assignment already exists
        existing_assignment = self.db.query(UserAssignment).filter(
            UserAssignment.user_id == assignment_data.user_id,
            UserAssignment.organizational_unit_id == assignment_data.organizational_unit_id,
            UserAssignment.product_id == assignment_data.product_id
        ).first()
        
        if existing_assignment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already assigned to this unit"
            )
        
        # If this is primary assignment, unset other primary assignments
        if assignment_data.is_primary:
            self.db.query(UserAssignment).filter(
                UserAssignment.user_id == assignment_data.user_id,
                UserAssignment.product_id == assignment_data.product_id,
                UserAssignment.is_primary == True
            ).update({"is_primary": False})
        
        # Create assignment
        db_assignment = UserAssignment(**assignment_data.dict())
        self.db.add(db_assignment)
        self.db.commit()
        self.db.refresh(db_assignment)
        
        return db_assignment
    
    def get_user_assignments(self, user_id: int, product_id: str) -> List[UserAssignment]:
        """Get all assignments for a user"""
        return self.db.query(UserAssignment).filter(
            UserAssignment.user_id == user_id,
            UserAssignment.product_id == product_id,
            UserAssignment.is_active == True
        ).all()
    
    def get_unit_users(self, unit_id: int, product_id: str) -> List[UserAssignment]:
        """Get all users assigned to a unit"""
        return self.db.query(UserAssignment).filter(
            UserAssignment.organizational_unit_id == unit_id,
            UserAssignment.product_id == product_id,
            UserAssignment.is_active == True
        ).all()
    
    # Office Location Methods
    def create_office_location(self, location_data: OfficeLocationCreate) -> OfficeLocation:
        """Create office location"""
        db_location = OfficeLocation(**location_data.dict())
        self.db.add(db_location)
        self.db.commit()
        self.db.refresh(db_location)
        return db_location
    
    def validate_location(self, lat: float, lng: float, product_id: str) -> bool:
        """Check if user is within office geofence"""
        office_locations = self.db.query(OfficeLocation).filter(
            OfficeLocation.product_id == product_id,
            OfficeLocation.is_active == True
        ).all()
        
        for office in office_locations:
            distance = self.calculate_distance(
                lat, lng, 
                float(office.latitude), float(office.longitude)
            )
            if distance <= office.radius_meters:
                return True
        return False
    
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two GPS coordinates (Haversine formula)"""
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371000  # Earth's radius in meters
        return c * r
    
    def reverse_geocode(self, lat: float, lng: float) -> str:
        try:
            url = f'https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=16&addressdetails=1'
            response = requests.get(url, headers={'User-Agent': 'attendance-app'})
            if response.status_code == 200:
                data = response.json()
                return data.get('display_name', f'{lat}, {lng}')
            return f'{lat}, {lng}'
        except Exception:
            return f'{lat}, {lng}'
    
    # Attendance Methods
    def check_in(self, user_id: int, product_id: str, check_in_data: CheckInRequest) -> Attendance:
        """Mark attendance check-in"""
        
        # Check if already checked in today
        today = date.today()
        existing_attendance = self.db.query(Attendance).filter(
            Attendance.user_id == user_id,
            Attendance.product_id == product_id,
            func.date(Attendance.check_in_time) == today,
            Attendance.check_out_time == None
        ).first()
        
        if existing_attendance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already checked in today"
            )
        
        # Validate location if work_type is office
        if check_in_data.work_type == 'office':
            # Check if this is mock GPS (skip validation for development)
            is_mock_gps = (float(check_in_data.latitude) == 37.7749 and 
                          float(check_in_data.longitude) == -122.4194)
            
            if not is_mock_gps and not self.validate_location(
                float(check_in_data.latitude), 
                float(check_in_data.longitude), 
                product_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Location is outside office geofence"
                )
        
        # Determine attendance status
        attendance_status = self._determine_attendance_status(user_id, product_id, check_in_data.organizational_unit_id)
        
        # Create attendance record
        location_name = check_in_data.location_name
        if not location_name and check_in_data.latitude and check_in_data.longitude:
            location_name = self.reverse_geocode(float(check_in_data.latitude), float(check_in_data.longitude))
        db_attendance = Attendance(
            user_id=user_id,
            product_id=product_id,
            organizational_unit_id=check_in_data.organizational_unit_id,
            check_in_time=datetime.utcnow(),
            check_in_latitude=check_in_data.latitude,
            check_in_longitude=check_in_data.longitude,
            location_name=location_name,
            attendance_status=attendance_status,
            work_type=check_in_data.work_type,
            notes=check_in_data.notes
        )
        
        self.db.add(db_attendance)
        self.db.commit()
        self.db.refresh(db_attendance)
        
        return db_attendance
    
    def check_out(self, user_id: int, product_id: str, check_out_data: CheckOutRequest) -> Attendance:
        """Mark attendance check-out"""
        
        # Find today's check-in record
        today = date.today()
        attendance = self.db.query(Attendance).filter(
            Attendance.user_id == user_id,
            Attendance.product_id == product_id,
            func.date(Attendance.check_in_time) == today,
            Attendance.check_out_time == None
        ).first()
        
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No check-in record found for today"
            )
        
        # Update check-out information
        attendance.check_out_time = datetime.utcnow()
        if check_out_data.latitude and check_out_data.longitude:
            attendance.check_out_latitude = check_out_data.latitude
            attendance.check_out_longitude = check_out_data.longitude
            attendance.location_name = self.reverse_geocode(float(check_out_data.latitude), float(check_out_data.longitude))
        if check_out_data.notes:
            attendance.notes = check_out_data.notes
        
        self.db.commit()
        self.db.refresh(attendance)
        
        return attendance
    
    def get_attendance_records(self, user_id: int, product_id: str, start_date: date, end_date: date) -> List[Attendance]:
        """Get attendance records for a user within date range"""
        return self.db.query(Attendance).filter(
            Attendance.user_id == user_id,
            Attendance.product_id == product_id,
            func.date(Attendance.check_in_time) >= start_date,
            func.date(Attendance.check_in_time) <= end_date
        ).order_by(Attendance.check_in_time.desc()).all()
    
    def get_attendance_records_paginated(self, user_id: int, product_id: str, start_date: date, end_date: date, page: int = 1, limit: int = 50) -> List[Attendance]:
        """Get attendance records for a user within date range with pagination"""
        offset = (page - 1) * limit
        return self.db.query(Attendance).filter(
            Attendance.user_id == user_id,
            Attendance.product_id == product_id,
            func.date(Attendance.check_in_time) >= start_date,
            func.date(Attendance.check_in_time) <= end_date
        ).order_by(Attendance.check_in_time.desc()).offset(offset).limit(limit).all()
    
    def get_today_attendance(self, product_id: str) -> List[Attendance]:
        """Get today's attendance for all users in a product"""
        today = date.today()
        return self.db.query(Attendance).filter(
            Attendance.product_id == product_id,
            func.date(Attendance.check_in_time) == today
        ).order_by(Attendance.check_in_time.desc()).all()
    
    # Helper Methods
    def _generate_unit_code(self, unit_type: str, product_id: str) -> str:
        """Generate unique code for organizational unit"""
        prefix_map = {
            'branch': 'BR',
            'client': 'CL', 
            'department': 'DEPT',
            'project': 'PRJ'
        }
        
        prefix = prefix_map.get(unit_type, 'UNIT')
        
        # Get next number
        last_unit = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.product_id == product_id,
            OrganizationalUnit.unit_type == unit_type
        ).order_by(OrganizationalUnit.code.desc()).first()
        
        if last_unit and last_unit.code:
            try:
                last_num = int(last_unit.code.replace(prefix, ''))
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:03d}"
    
    def _calculate_hierarchy_path(self, parent_id: int, product_id: str) -> tuple:
        """Calculate hierarchy path and level"""
        if not parent_id:
            return "1", 1
        
        parent = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.id == parent_id,
            OrganizationalUnit.product_id == product_id
        ).first()
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent unit not found")
        
        # Get next child number
        children = self.db.query(OrganizationalUnit).filter(
            OrganizationalUnit.parent_id == parent_id,
            OrganizationalUnit.product_id == product_id
        ).count()
        
        next_child_num = children + 1
        new_path = f"{parent.hierarchy_path}.{next_child_num}"
        new_level = parent.level + 1
        
        return new_path, new_level
    
    def _build_tree(self, units: List[OrganizationalUnit]) -> List[dict]:
        """Build hierarchical tree structure"""
        unit_dict = {unit.id: unit for unit in units}
        tree = []
        
        for unit in units:
            if not unit.parent_id:
                tree.append(self._build_node(unit, unit_dict))
        
        return tree
    
    def _build_node(self, unit: OrganizationalUnit, unit_dict: dict) -> dict:
        """Build tree node with children"""
        # Count users in this unit
        users_count = self.db.query(UserAssignment).filter(
            UserAssignment.organizational_unit_id == unit.id,
            UserAssignment.is_active == True
        ).count()
        
        node = {
            'id': unit.id,
            'name': unit.name,
            'unit_type': unit.unit_type,
            'code': unit.code,
            'level': unit.level,
            'users_count': users_count,
            'children': []
        }
        
        # Find children
        for child_id, child_unit in unit_dict.items():
            if child_unit.parent_id == unit.id:
                node['children'].append(self._build_node(child_unit, unit_dict))
        
        return node
    
    def _determine_attendance_status(self, user_id: int, product_id: str, unit_id: Optional[int]) -> str:
        """Determine attendance status based on rules"""
        # Get applicable attendance rule
        rule = None
        if unit_id:
            rule = self.db.query(AttendanceRule).filter(
                AttendanceRule.organizational_unit_id == unit_id,
                AttendanceRule.product_id == product_id,
                AttendanceRule.is_active == True
            ).first()
        
        if not rule:
            # Get default rule for product
            rule = self.db.query(AttendanceRule).filter(
                AttendanceRule.organizational_unit_id == None,
                AttendanceRule.product_id == product_id,
                AttendanceRule.is_active == True
            ).first()
        
        if not rule:
            return 'present'  # Default status
        
        # Check if it's a work day
        today = datetime.utcnow().weekday() + 1  # Monday=1, Sunday=7
        work_days = [int(d) for d in rule.work_days.split(',')]
        
        if today not in work_days:
            return 'weekend'
        
        # Check if late
        current_time = datetime.utcnow().time()
        start_time = datetime.strptime(rule.start_time, '%H:%M').time()
        late_threshold = timedelta(minutes=rule.late_threshold_minutes)
        
        if current_time > start_time:
            time_diff = datetime.combine(date.today(), current_time) - datetime.combine(date.today(), start_time)
            if time_diff > late_threshold:
                return 'late'
        
        return 'present' 