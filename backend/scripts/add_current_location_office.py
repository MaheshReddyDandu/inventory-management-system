#!/usr/bin/env python3
"""
Quick script to add current location as office for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.organization import OfficeLocation

def add_current_location_office():
    """Add current location as office for testing"""
    db = SessionLocal()
    try:
        # Current location coordinates (Bangalore area)
        current_location = {
            "product_id": "SYSTEM",  # Use SYSTEM for testing, change to your actual product_id
            "location_name": "Current Location Office",
            "address": "Current Location, Bangalore, India",
            "latitude": 12.962456,
            "longitude": 77.716390,
            "radius_meters": 2000  # 2km radius to ensure coverage
        }
        
        # Check if office already exists
        existing_office = db.query(OfficeLocation).filter(
            OfficeLocation.location_name == current_location["location_name"],
            OfficeLocation.product_id == current_location["product_id"]
        ).first()
        
        if existing_office:
            print("Current location office already exists")
            return
        
        # Create office location
        office = OfficeLocation(
            product_id=current_location["product_id"],
            location_name=current_location["location_name"],
            address=current_location["address"],
            latitude=current_location["latitude"],
            longitude=current_location["longitude"],
            radius_meters=current_location["radius_meters"],
            is_active=True
        )
        
        db.add(office)
        db.commit()
        print("Current location office added successfully!")
        print(f"Location: {current_location['latitude']}, {current_location['longitude']}")
        print(f"Radius: {current_location['radius_meters']} meters")
        print("You can now test check-in/check-out with location validation enabled.")
        
    except Exception as e:
        print(f"Error adding current location office: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_current_location_office() 