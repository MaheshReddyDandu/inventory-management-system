#!/usr/bin/env python3
"""
API Usage Examples
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def register_user():
    """Register a new user"""
    data = {
        "email": "user@example.com",
        "username": "testuser",
        "password": "securepassword123",
        "first_name": "John",
        "last_name": "Doe",
        "product_id": "PRODUCT_001",
        "role_id": 3
    }
    
    response = requests.post(f"{BASE_URL}/auth/signup", json=data)
    return response.json()

def login_user():
    """Login user"""
    data = {
        "email": "user@example.com",
        "password": "securepassword123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    return response.json()

def get_user_info(access_token):
    """Get current user information"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    return response.json()

def refresh_token(refresh_token):
    """Refresh access token"""
    data = {"refresh_token": refresh_token}
    response = requests.post(f"{BASE_URL}/auth/refresh", json=data)
    return response.json()

def logout(refresh_token, access_token):
    """Logout user"""
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"refresh_token": refresh_token}
    response = requests.post(f"{BASE_URL}/auth/logout", json=data, headers=headers)
    return response.json()

def forgot_password():
    """Request password reset"""
    data = {"email": "user@example.com"}
    response = requests.post(f"{BASE_URL}/auth/forgot-password", json=data)
    return response.json()

def reset_password(token, new_password):
    """Reset password"""
    data = {
        "token": token,
        "new_password": new_password
    }
    response = requests.post(f"{BASE_URL}/auth/reset-password", json=data)
    return response.json()

def get_users(access_token):
    """Get all users (admin only)"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/users", headers=headers)
    return response.json()

def health_check():
    """Basic health check"""
    response = requests.get("http://localhost:8000/health")
    return response.json()

def detailed_health_check():
    """Detailed health check"""
    response = requests.get("http://localhost:8000/health/detailed")
    return response.json()

def main():
    """Main example function"""
    print("=== FastAPI Authentication System - API Examples ===\n")
    
    # Health check
    print("1. Health Check")
    try:
        health = health_check()
        print(json.dumps(health, indent=2))
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Register user
    print("2. Registering user...")
    try:
        register_result = register_user()
        print(json.dumps(register_result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Login user
    print("3. Logging in user...")
    try:
        login_result = login_user()
        print(json.dumps(login_result, indent=2))
        
        if "access_token" in login_result:
            access_token = login_result["access_token"]
            refresh_token_value = login_result["refresh_token"]
            
            # Get user info
            print("\n4. Getting user info...")
            user_info = get_user_info(access_token)
            print(json.dumps(user_info, indent=2))
            
            # Refresh token
            print("\n5. Refreshing token...")
            refresh_result = refresh_token(refresh_token_value)
            print(json.dumps(refresh_result, indent=2))
            
            # Logout
            print("\n6. Logging out...")
            logout_result = logout(refresh_token_value, access_token)
            print(json.dumps(logout_result, indent=2))
            
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Admin login
    print("7. Admin login...")
    try:
        admin_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        admin_response = requests.post(f"{BASE_URL}/auth/login", json=admin_data)
        admin_result = admin_response.json()
        print(json.dumps(admin_result, indent=2))
        
        if "access_token" in admin_result:
            admin_token = admin_result["access_token"]
            
            # Get all users (admin only)
            print("\n8. Getting all users (admin only)...")
            users = get_users(admin_token)
            print(json.dumps(users, indent=2))
            
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Detailed health check
    print("9. Detailed health check...")
    try:
        detailed_health = detailed_health_check()
        print(json.dumps(detailed_health, indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 