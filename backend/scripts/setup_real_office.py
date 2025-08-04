#!/usr/bin/env python3
"""
Setup real office locations for your business
Replace the coordinates below with your actual office locations
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.organization import OfficeLocation

def setup_real_offices():
    """Setup real office locations for your business"""
    db = SessionLocal()
    try:
        # Replace these with your actual office locations
        # You can get coordinates from Google Maps by right-clicking on a location
        real_offices = [
            {
                "product_id": "your-product-id",  # Replace with your actual product_id
                "location_name": "Main Office",
                "address": "Your Main Office Address, City, State, ZIP",
                "latitude": 12.962456,  # Example: Bangalore coordinates
                "longitude": 77.716390,  # Example: Bangalore coordinates
                "radius_meters": 1000  # 1km radius for geofence
            },
            # Add more offices as needed
            # {
            #     "product_id": "your-product-id",
            #     "location_name": "Branch Office",
            #     "address": "Your Branch Office Address, City, State, ZIP",
            #     "latitude": 37.7844,  # Replace with actual latitude
            #     "longitude": -122.4089,  # Replace with actual longitude
            #     "radius_meters": 300
            # }
        ]
        
        for office_data in real_offices:
            # Check if office already exists
            existing_office = db.query(OfficeLocation).filter(
                OfficeLocation.location_name == office_data["location_name"],
                OfficeLocation.product_id == office_data["product_id"]
            ).first()
            
            if existing_office:
                print(f"Office '{office_data['location_name']}' already exists, skipping...")
                continue
            
            # Create office location
            office = OfficeLocation(
                product_id=office_data["product_id"],
                location_name=office_data["location_name"],
                address=office_data["address"],
                latitude=office_data["latitude"],
                longitude=office_data["longitude"],
                radius_meters=office_data["radius_meters"],
                is_active=True
            )
            
            db.add(office)
            print(f"Added office: {office_data['location_name']}")
            print(f"  Address: {office_data['address']}")
            print(f"  Coordinates: {office_data['latitude']}, {office_data['longitude']}")
            print(f"  Geofence radius: {office_data['radius_meters']} meters")
            print()
        
        db.commit()
        print("Real office locations setup completed!")
        print("\nIMPORTANT: Please update the coordinates in this script with your actual office locations.")
        print("You can get coordinates from Google Maps by right-clicking on your office location.")
        
    except Exception as e:
        print(f"Error setting up real offices: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_real_offices() 