#!/usr/bin/env python3
"""
Seed script to populate initial data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.user import User, Role
from app.core.security import get_password_hash
from app.core.config import settings

def seed_roles():
    """Seed initial roles for SYSTEM product"""
    db = SessionLocal()
    try:
        # Check if roles already exist for SYSTEM product
        existing_roles = db.query(Role).filter(Role.product_id == "SYSTEM").count()
        if existing_roles > 0:
            print("SYSTEM roles already exist, skipping...")
            return
        
        # Create roles for SYSTEM product
        roles = [
            Role(
                name="admin",
                description="Administrator with full access",
                permissions='["read", "write", "delete", "admin"]',
                product_id="SYSTEM"
            ),
            Role(
                name="manager",
                description="Manager with limited admin access",
                permissions='["read", "write", "manage"]',
                product_id="SYSTEM"
            ),
            Role(
                name="user",
                description="Regular user",
                permissions='["read"]',
                product_id="SYSTEM"
            )
        ]
        
        for role in roles:
            db.add(role)
        
        db.commit()
        print("SYSTEM roles seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding roles: {e}")
        db.rollback()
    finally:
        db.close()

def seed_admin_user():
    """Seed admin user"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.email == "admin@example.com").first()
        if admin_user:
            print("Admin user already exists, skipping...")
            return
        
        # Get admin role for SYSTEM product
        admin_role = db.query(Role).filter(
            Role.name == "admin",
            Role.product_id == "SYSTEM"
        ).first()
        if not admin_role:
            print("SYSTEM admin role not found, please run seed_roles first!")
            return
        
        # Create admin user
        admin_user = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            product_id="SYSTEM",
            role_id=admin_role.id,
            is_verified=True
        )
        
        db.add(admin_user)
        db.commit()
        print("Admin user seeded successfully!")
        print("Email: admin@example.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main seeding function"""
    print("Starting database seeding...")
    
    # Create tables
    from app.models.user import Base
    Base.metadata.create_all(bind=engine)
    
    # Seed roles
    seed_roles()
    
    # Seed admin user
    seed_admin_user()
    
    print("Database seeding completed!")

if __name__ == "__main__":
    main() 