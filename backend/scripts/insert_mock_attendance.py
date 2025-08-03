#!/usr/bin/env python3
"""
Mock Attendance Data Generator
Creates realistic attendance data for the past week to test UI functionality.
Includes various scenarios: full days, partial days, remote work, late arrivals, etc.
"""

import os
import sys
from datetime import datetime, timedelta, time
import random
from decimal import Decimal

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.organization import Attendance
from app.core.config import settings

# Database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Sample locations with coordinates
LOCATIONS = [
    {
        "name": "Market Street, Hayes Valley, San Francisco, California, 94102, United States",
        "lat": Decimal("14.4426"),
        "lng": Decimal("79.9865")
    },
    {
        "name": "Financial District, San Francisco, California, 94111, United States", 
        "lat": Decimal("37.794500"),
        "lng": Decimal("-122.399800")
    },
    {
        "name": "Mission District, San Francisco, California, 94110, United States",
        "lat": Decimal("37.759900"),
        "lng": Decimal("-122.414300")
    },
    {
        "name": "Home Office - Remote Work",
        "lat": Decimal("37.784400"),
        "lng": Decimal("-122.408900")
    },
    {
        "name": "Client Site - Tech Company, SOMA, San Francisco, CA",
        "lat": Decimal("37.781300"),
        "lng": Decimal("-122.403500")
    }
]

WORK_TYPES = ["office", "remote", "client-site", "travel"]

def get_random_location():
    """Get a random location from the predefined list"""
    return random.choice(LOCATIONS)

def create_work_session(user_id, product_id, date, start_time, end_time=None, work_type="office", location=None, notes=None):
    """Create a work session for a specific date and time"""
    if location is None:
        location = get_random_location()
    
    # Create check-in time
    check_in_datetime = datetime.combine(date, start_time)
    
    # Create attendance record
    attendance = Attendance(
        user_id=user_id,
        product_id=product_id,
        check_in_time=check_in_datetime,
        check_in_latitude=location["lat"],
        check_in_longitude=location["lng"],
        location_name=location["name"],
        work_type=work_type,
        notes=notes
    )
    
    # Add check-out if provided
    if end_time:
        check_out_datetime = datetime.combine(date, end_time)
        attendance.check_out_time = check_out_datetime
        attendance.check_out_latitude = location["lat"]
        attendance.check_out_longitude = location["lng"]
    
    return attendance

def generate_mock_data():
    """Generate comprehensive mock attendance data for the past week"""
    db = SessionLocal()
    
    try:
        # Get the first user (or create test scenarios for multiple users)
        user = db.query(User).first()
        if not user:
            print("No user found in database. Please create a user first.")
            return
        
        user_id = user.id
        product_id = user.product_id
        
        print(f"Generating mock data for user: {user.username} (ID: {user_id})")
        
        # Clear existing attendance data for this user (optional - uncomment if needed)
        # db.query(Attendance).filter(Attendance.user_id == user_id).delete()
        # print("Cleared existing attendance data")
        
        today = datetime.now().date()
        
        # Generate data for the past 7 days
        for days_ago in range(7, 0, -1):
            work_date = today - timedelta(days=days_ago)
            day_name = work_date.strftime("%A")
            
            print(f"\nGenerating data for {day_name}, {work_date}")
            
            # Skip weekends for some scenarios (make it realistic)
            if day_name in ["Saturday", "Sunday"] and random.choice([True, False]):
                print("  Skipping weekend")
                continue
            
            # Different scenarios based on day
            if days_ago == 7:  # Monday - Full productive day with multiple sessions
                sessions = [
                    create_work_session(user_id, product_id, work_date, 
                                      time(9, 0), time(12, 30), "office",
                                      notes="Morning development work"),
                    create_work_session(user_id, product_id, work_date,
                                      time(13, 30), time(17, 0), "office",
                                      notes="Afternoon meetings and code review")
                ]
                
            elif days_ago == 6:  # Tuesday - Remote work day
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(8, 30), time(12, 0), "remote",
                                      LOCATIONS[3], "Remote work from home"),
                    create_work_session(user_id, product_id, work_date,
                                      time(13, 0), time(16, 30), "remote", 
                                      LOCATIONS[3], "Afternoon remote session")
                ]
                
            elif days_ago == 5:  # Wednesday - Late start, long day
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(10, 15), time(18, 45), "office",
                                      notes="Late start but worked late to compensate")
                ]
                
            elif days_ago == 4:  # Thursday - Client site visit
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(9, 30), time(11, 30), "office",
                                      notes="Morning office prep"),
                    create_work_session(user_id, product_id, work_date,
                                      time(14, 0), time(17, 30), "client-site",
                                      LOCATIONS[4], "Client presentation and meetings")
                ]
                
            elif days_ago == 3:  # Friday - Short day
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(9, 0), time(15, 0), "office",
                                      notes="Friday short day - team lunch")
                ]
                
            elif days_ago == 2:  # Day before yesterday - Mixed work
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(8, 45), time(12, 15), "office"),
                    create_work_session(user_id, product_id, work_date,
                                      time(13, 15), time(15, 45), "remote",
                                      LOCATIONS[3], "Afternoon remote work")
                ]
                
            else:  # Yesterday - Partial day (still working)
                sessions = [
                    create_work_session(user_id, product_id, work_date,
                                      time(9, 15), time(12, 45), "office",
                                      notes="Morning session"),
                    create_work_session(user_id, product_id, work_date,
                                      time(14, 0), None, "office",
                                      notes="Currently working - not checked out yet")
                ]
            
            # Add sessions to database
            for session in sessions:
                db.add(session)
                check_out_status = "✓" if session.check_out_time else "⏳ (active)"
                print(f"  Added session: {session.check_in_time.strftime('%H:%M')} - {session.check_out_time.strftime('%H:%M') if session.check_out_time else 'ongoing'} {check_out_status}")
        
        # Add today's data
        print(f"\nGenerating data for Today, {today}")
        today_sessions = [
            create_work_session(user_id, product_id, today,
                              time(8, 50), time(10, 35), "office",
                              notes="Early morning focus work"),
            create_work_session(user_id, product_id, today,
                              time(11, 5), time(12, 20), "office", 
                              notes="Team standup and planning"),
            create_work_session(user_id, product_id, today,
                              time(13, 25), None, "office",
                              notes="Current active session - UI testing")
        ]
        
        for session in today_sessions:
            db.add(session)
            check_out_status = "✓" if session.check_out_time else "⏳ (active)"
            print(f"  Added session: {session.check_in_time.strftime('%H:%M')} - {session.check_out_time.strftime('%H:%M') if session.check_out_time else 'ongoing'} {check_out_status}")
        
        # Commit all changes
        db.commit()
        print(f"\n✅ Successfully generated mock attendance data!")
        print(f"📊 Total sessions created: Multiple sessions across 7 days")
        print(f"🎯 Scenarios covered:")
        print(f"   • Full productive days with lunch breaks")
        print(f"   • Remote work sessions")
        print(f"   • Late arrivals and overtime")
        print(f"   • Client site visits")
        print(f"   • Mixed office/remote days")
        print(f"   • Currently active sessions")
        print(f"   • Weekend variations")
        
    except Exception as e:
        print(f"❌ Error generating mock data: {e}")
        db.rollback()
    finally:
        db.close()

def clear_attendance_data():
    """Clear all attendance data (use with caution!)"""
    db = SessionLocal()
    try:
        count = db.query(Attendance).count()
        db.query(Attendance).delete()
        db.commit()
        print(f"✅ Cleared {count} attendance records")
    except Exception as e:
        print(f"❌ Error clearing data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎭 Mock Attendance Data Generator")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        print("⚠️  Clearing existing attendance data...")
        clear_attendance_data()
    
    print("🔄 Generating comprehensive mock attendance data...")
    generate_mock_data()
    
    print("\n🎉 Mock data generation complete!")
    print("💡 You can now test your UI with realistic attendance scenarios.")
    print("\n📱 Test scenarios include:")
    print("   • Multiple check-ins/check-outs per day")
    print("   • Different work types (office, remote, client-site)")
    print("   • Various locations across San Francisco")
    print("   • Active sessions (not checked out)")
    print("   • Weekend and weekday patterns")
    print("   • Short days, long days, and normal days")