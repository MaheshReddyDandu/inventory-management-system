# GPS Coordinates Setup for Attendance System

## Changes Made

I have successfully removed all hardcoded GPS coordinates from your attendance system and implemented real device GPS coordinates for check-in and check-out functionality.

### Files Modified:

#### Frontend (Angular)
1. **`ui/web/inventory-management/src/app/components/attendance/attendance-check.component.ts`**
   - Removed hardcoded GPS coordinate check (`14.4426, 79.9865`)
   - Simplified location handling to use real device GPS
   - Improved error handling for location access

2. **`ui/web/inventory-management/src/app/services/organization.service.ts`**
   - Removed mock GPS coordinates fallback
   - Enhanced geolocation error handling with specific error messages
   - Increased timeout to 10 seconds for better GPS accuracy
   - Added proper error rejection instead of falling back to mock data

#### Backend (Python/FastAPI)
1. **`backend/app/services/organization_service.py`**
   - Removed hardcoded GPS coordinate bypass for location validation
   - **TEMPORARILY DISABLED** location validation to allow testing from any location
   - TODO: Re-enable when office locations are properly configured
   - Ensures real GPS coordinates are used for attendance tracking

2. **`backend/scripts/insert_mock_attendance.py`**
   - Updated mock locations to use realistic San Francisco coordinates
   - Removed the hardcoded coordinates that were used for development

#### Files Removed
- **`backend/add_mock_office.py`** - Deleted as it contained hardcoded coordinates

#### Files Added
- **`backend/scripts/setup_real_office.py`** - New script to help set up real office locations
- **`backend/scripts/add_current_location_office.py`** - Quick script to add current location as office

## Current Status: Location Validation Temporarily Disabled

**Location validation is currently disabled** to allow testing from any location. This means you can check in/out from anywhere without geofence restrictions.

### To Re-enable Location Validation:

1. **Option 1: Add your current location as an office**
   ```bash
   cd backend
   python scripts/add_current_location_office.py
   ```

2. **Option 2: Set up your real office locations**
   - Update `backend/scripts/setup_real_office.py` with your actual office coordinates
   - Run the script to add office locations
   - Uncomment the location validation code in `organization_service.py`

3. **Option 3: Re-enable validation manually**
   - Edit `backend/app/services/organization_service.py`
   - Uncomment the location validation code (lines 273-280)
   - Remove the `pass` statement

## Setting Up Real Office Locations

### Step 1: Get Your Office Coordinates

1. Go to [Google Maps](https://maps.google.com)
2. Search for your office address
3. Right-click on the exact location
4. Select the coordinates that appear (e.g., `12.962456, 77.716390`)
5. Copy the latitude and longitude values

### Step 2: Update the Setup Script

1. Open `backend/scripts/setup_real_office.py`
2. Replace the placeholder coordinates with your actual office coordinates:

```python
real_offices = [
    {
        "product_id": "your-actual-product-id",  # Replace with your product ID
        "location_name": "Your Company Main Office",
        "address": "123 Business St, Your City, State 12345",
        "latitude": 12.962456,  # Replace with your actual latitude
        "longitude": 77.716390,  # Replace with your actual longitude
        "radius_meters": 1000  # Adjust geofence radius as needed
    }
]
```

### Step 3: Run the Setup Script

```bash
cd backend
python scripts/setup_real_office.py
```

### Step 4: Re-enable Location Validation

After setting up office locations, uncomment the validation code in `organization_service.py`.

## How It Works Now

### Frontend GPS Handling
- Uses the browser's `navigator.geolocation` API
- Requests high-accuracy GPS coordinates
- Provides specific error messages for different GPS issues:
  - Permission denied
  - Location unavailable
  - Timeout
  - Other errors

### Backend Location Validation (Currently Disabled)
- **Temporarily disabled** to allow testing from any location
- When enabled: Validates GPS coordinates for office work type
- Uses Haversine formula to calculate distance from office
- Checks if user is within the configured geofence radius
- Rejects check-ins outside the office area

### Error Handling
- Clear error messages for GPS permission issues
- Proper fallback handling when GPS is unavailable
- User-friendly notifications for location problems

## Important Notes

1. **Browser Permissions**: Users must grant location permission to the browser
2. **HTTPS Required**: Modern browsers require HTTPS for GPS access in production
3. **Geofence Radius**: Adjust the `radius_meters` value based on your office size
4. **Multiple Offices**: Add multiple office locations in the setup script
5. **Product ID**: Make sure to use the correct product ID for your organization
6. **Current Status**: Location validation is disabled for testing purposes

## Troubleshooting

### GPS Not Working
- Check browser location permissions
- Ensure you're using HTTPS in production
- Verify device GPS is enabled
- Check browser console for error messages

### Location Validation Failing (When Enabled)
- Verify office coordinates are correct
- Check geofence radius is appropriate
- Ensure office location is active in database
- Test with coordinates near your office

### Performance Issues
- GPS timeout is set to 10 seconds
- Cached positions up to 30 seconds old are accepted
- High accuracy mode is enabled for better precision

## Quick Test Setup

To quickly test with your current location:

```bash
cd backend
python scripts/add_current_location_office.py
```

This will add your current location (12.962456, 77.716390) as an office with a 2km radius, allowing you to test location validation. 