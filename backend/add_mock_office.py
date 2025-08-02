#!/usr/bin/env python3
"""
Add a mock office location for development/testing with mock GPS
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.organization import OfficeLocation

def add_mock_office():
    db = SessionLocal()
    try:
        # Check if mock office already exists
        existing_office = db.query(OfficeLocation).filter(
            OfficeLocation.name == "Mock Development Office"
        ).first()
        
        if existing_office:
            print("Mock office location already exists")
            return
        
        # Add mock office location matching mock GPS coordinates
        mock_office = OfficeLocation(
            product_id="your-product-id",  # You'll need to replace this with actual product_id
            name="Mock Development Office",
            address="San Francisco, CA (Mock Location)",
            latitude=37.7749,
            longitude=-122.4194,
            radius_meters=1000,  # 1km radius
            is_active=True
        )
        
        db.add(mock_office)
        db.commit()
        print("Mock office location added successfully!")
        print(f"Location: {mock_office.latitude}, {mock_office.longitude}")
        print(f"Radius: {mock_office.radius_meters} meters")
        
    except Exception as e:
        print(f"Error adding mock office: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_mock_office()