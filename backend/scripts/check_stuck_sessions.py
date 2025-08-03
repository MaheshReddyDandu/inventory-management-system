#!/usr/bin/env python3
"""
Utility script to check for and resolve stuck attendance sessions.
This script helps identify users who have checked in but haven't checked out,
which prevents them from checking in again.
"""

import sys
import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.organization import Attendance
from app.models.user import User
from app.core.database import get_db

def check_stuck_sessions():
    """Check for users with stuck attendance sessions (checked in but not checked out)"""
    db = next(get_db())
    
    try:
        # Find all attendance records where check_out_time is null
        stuck_sessions = db.query(Attendance).filter(
            Attendance.check_out_time.is_(None)
        ).all()
        
        if not stuck_sessions:
            print("✅ No stuck attendance sessions found!")
            return
        
        print(f"⚠️  Found {len(stuck_sessions)} stuck attendance session(s):")
        print("-" * 80)
        
        for session in stuck_sessions:
            user = db.query(User).filter(User.id == session.user_id).first()
            print(f"Session ID: {session.id}")
            print(f"User: {user.email if user else 'Unknown'} (ID: {session.user_id})")
            print(f"Check-in Time: {session.check_in_time}")
            print(f"Work Type: {session.work_type}")
            print(f"Location: {session.location_name}")
            print("-" * 40)
        
        # Ask if user wants to resolve stuck sessions
        response = input("\nDo you want to check out all stuck sessions? (y/N): ")
        if response.lower() in ['y', 'yes']:
            resolve_stuck_sessions(stuck_sessions, db)
        else:
            print("Stuck sessions left unresolved.")
            
    except Exception as e:
        print(f"❌ Error checking stuck sessions: {e}")
    finally:
        db.close()

def resolve_stuck_sessions(stuck_sessions, db):
    """Resolve stuck attendance sessions by checking them out"""
    try:
        resolved_count = 0
        
        for session in stuck_sessions:
            # Set check-out time to current time
            session.check_out_time = datetime.utcnow().replace(tzinfo=timezone.utc)
            session.notes = f"{session.notes or ''} [Auto-checkout by admin script]"
            resolved_count += 1
        
        db.commit()
        print(f"✅ Successfully resolved {resolved_count} stuck session(s)!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error resolving stuck sessions: {e}")

def check_user_sessions(user_email):
    """Check attendance sessions for a specific user"""
    db = next(get_db())
    
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            print(f"❌ User with email '{user_email}' not found!")
            return
        
        sessions = db.query(Attendance).filter(
            Attendance.user_id == user.id
        ).order_by(Attendance.check_in_time.desc()).limit(10).all()
        
        print(f"📊 Attendance sessions for {user.email}:")
        print("-" * 80)
        
        for session in sessions:
            status = "🟢 Checked Out" if session.check_out_time else "🔴 Checked In"
            print(f"Session ID: {session.id}")
            print(f"Status: {status}")
            print(f"Check-in: {session.check_in_time}")
            if session.check_out_time:
                print(f"Check-out: {session.check_out_time}")
            print(f"Work Type: {session.work_type}")
            print(f"Location: {session.location_name}")
            print("-" * 40)
            
    except Exception as e:
        print(f"❌ Error checking user sessions: {e}")
    finally:
        db.close()

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "check":
            check_stuck_sessions()
        elif command == "user" and len(sys.argv) > 2:
            user_email = sys.argv[2]
            check_user_sessions(user_email)
        else:
            print_usage()
    else:
        check_stuck_sessions()

def print_usage():
    """Print usage instructions"""
    print("Attendance Session Management Utility")
    print("=" * 40)
    print("Usage:")
    print("  python check_stuck_sessions.py                    # Check for stuck sessions")
    print("  python check_stuck_sessions.py check             # Check for stuck sessions")
    print("  python check_stuck_sessions.py user <email>      # Check user's sessions")
    print("\nExamples:")
    print("  python check_stuck_sessions.py")
    print("  python check_stuck_sessions.py user admin@example.com")

if __name__ == "__main__":
    main() 