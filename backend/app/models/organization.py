from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index, Date, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class OrganizationalUnit(Base):
    __tablename__ = "organizational_units"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    parent_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=True)
    unit_type = Column(String(50), nullable=False, index=True)  # branch, client, department, project
    name = Column(String(255), nullable=False)
    code = Column(String(50), index=True)  # BR001, CL001, DEPT001, PRJ001
    description = Column(Text)
    address = Column(Text)
    contact_person = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Hierarchy fields
    hierarchy_path = Column(Text, index=True)  # e.g., "1.5.12.23"
    level = Column(Integer, default=1, index=True)
    sort_order = Column(Integer, default=0)
    
    # Relationships
    parent = relationship("OrganizationalUnit", remote_side=[id], back_populates="children")
    children = relationship("OrganizationalUnit", back_populates="parent")
    user_assignments = relationship("UserAssignment", back_populates="organizational_unit", cascade="all, delete-orphan")
    unit_metadata = relationship("OrganizationalUnitMetadata", back_populates="organizational_unit", cascade="all, delete-orphan")
    
    # Composite indexes for performance
    __table_args__ = (
        Index('idx_org_unit_product_type', 'product_id', 'unit_type'),
        Index('idx_org_unit_hierarchy', 'product_id', 'hierarchy_path'),
        Index('idx_org_unit_parent', 'product_id', 'parent_id'),
        Index('idx_org_unit_code_product', 'code', 'product_id'),
    )

class UserAssignment(Base):
    __tablename__ = "user_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organizational_unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=False, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    role_in_unit = Column(String(100), nullable=False)  # manager, member, lead, supervisor
    is_primary = Column(Boolean, default=False, index=True)  # Primary assignment
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="assignments")
    organizational_unit = relationship("OrganizationalUnit", back_populates="user_assignments")
    
    # Composite unique constraint
    __table_args__ = (
        Index('idx_user_assignment_unique', 'user_id', 'organizational_unit_id', 'product_id'),
        Index('idx_user_assignment_product', 'product_id', 'is_active'),
        Index('idx_user_assignment_primary', 'user_id', 'product_id', 'is_primary'),
    )

class OrganizationalUnitMetadata(Base):
    __tablename__ = "organizational_unit_metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    organizational_unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=False, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text)
    field_type = Column(String(50), default='text')  # text, number, date, boolean
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organizational_unit = relationship("OrganizationalUnit", back_populates="unit_metadata")
    
    # Composite indexes
    __table_args__ = (
        Index('idx_metadata_unit_field', 'organizational_unit_id', 'field_name'),
        Index('idx_metadata_product', 'product_id', 'field_name'),
    )

class OfficeLocation(Base):
    __tablename__ = "office_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    organizational_unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=True)
    location_name = Column(String(255), nullable=False)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    radius_meters = Column(Integer, default=100)  # Geofence radius
    address = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organizational_unit = relationship("OrganizationalUnit")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_office_location_product', 'product_id', 'is_active'),
        Index('idx_office_location_coords', 'latitude', 'longitude'),
    )

class AttendanceRule(Base):
    __tablename__ = "attendance_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    organizational_unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=True)
    rule_name = Column(String(255), nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)  # HH:MM format
    late_threshold_minutes = Column(Integer, default=15)
    half_day_threshold_hours = Column(Integer, default=4)
    work_days = Column(String(20), default='1,2,3,4,5')  # Monday=1, Sunday=7
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organizational_unit = relationship("OrganizationalUnit")
    
    # Indexes
    __table_args__ = (
        Index('idx_attendance_rule_product', 'product_id', 'is_active'),
        Index('idx_attendance_rule_unit', 'organizational_unit_id', 'is_active'),
    )

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(String(100), nullable=False, index=True)  # Multi-tenant support
    organizational_unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=True)
    check_in_time = Column(DateTime(timezone=True))
    check_out_time = Column(DateTime(timezone=True))
    check_in_latitude = Column(DECIMAL(10, 8))
    check_in_longitude = Column(DECIMAL(11, 8))
    check_out_latitude = Column(DECIMAL(10, 8))
    check_out_longitude = Column(DECIMAL(11, 8))
    location_name = Column(String(255))
    attendance_status = Column(String(50), default='present')  # present, absent, late, half-day, remote
    work_type = Column(String(50), default='office')  # office, remote, client-site, travel
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="attendance_records")
    organizational_unit = relationship("OrganizationalUnit")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_attendance_user_date', 'user_id', 'check_in_time'),
        Index('idx_attendance_product_date', 'product_id', 'check_in_time'),
        Index('idx_attendance_unit_date', 'organizational_unit_id', 'check_in_time'),
        Index('idx_attendance_status', 'product_id', 'attendance_status'),
        Index('idx_attendance_coords', 'check_in_latitude', 'check_in_longitude'),
    ) 