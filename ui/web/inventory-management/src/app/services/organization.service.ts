import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface OrganizationalUnit {
  id: number;
  product_id: string;
  parent_id?: number;
  unit_type: string; // branch, client, department, project
  name: string;
  code: string;
  description?: string;
  address?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hierarchy_path: string;
  level: number;
  sort_order: number;
  users_count?: number;
  children_count?: number;
}

export interface HierarchyNode {
  id: number;
  name: string;
  unit_type: string;
  code: string;
  level: number;
  users_count: number;
  children: HierarchyNode[];
}

export interface UserAssignment {
  id: number;
  user_id: number;
  organizational_unit_id: number;
  product_id: string;
  role_in_unit: string;
  is_primary: boolean;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  notes?: string;
}

export interface OfficeLocation {
  id: number;
  product_id: string;
  organizational_unit_id?: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRule {
  id: number;
  product_id: string;
  organizational_unit_id?: number;
  name: string;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
  work_days: string; // comma-separated day numbers
  late_threshold_minutes: number;
  is_active: boolean;
}

export interface Attendance {
  id: number;
  user_id: number;
  product_id: string;
  organizational_unit_id?: number;
  check_in_time: string;
  check_out_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  location_name?: string;
  attendance_status: string;
  work_type: string;
  notes?: string;
  created_at: string;
}

export interface CheckInRequest {
  organizational_unit_id?: number;
  latitude: number;
  longitude: number;
  location_name: string;
  work_type: string;
  notes?: string;
}

export interface CheckOutRequest {
  notes?: string;
  work_summary?: string;
  latitude?: number;
  longitude?: number;
}

export interface AttendanceRule {
  id: number;
  name: string;
  description?: string;
  rule_type: string;
  parameters: {
    start_time?: string;
    end_time?: string;
    late_threshold_minutes?: number;
    early_departure_threshold_minutes?: number;
    break_duration_minutes?: number;
    required_work_hours?: number;
    weekend_work_allowed?: boolean;
    remote_work_allowed?: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceReport {
  date: string;
  user_id: number;
  user_name?: string;
  organizational_unit_id?: number;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  work_type: string;
  total_hours?: number;
  notes?: string;
}

export interface OrganizationStats {
  total_units: number;
  total_users: number;
  total_assignments: number;
  units_by_type: { [key: string]: number };
  active_attendance_today: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly API_URL = 'http://localhost:8000/api/v1/organization';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('Organization Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Organizational Unit Methods
  createOrganizationalUnit(unitData: any): Observable<OrganizationalUnit> {
    return this.http.post<OrganizationalUnit>(`${this.API_URL}/units`, unitData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getOrganizationalUnits(unitType?: string): Observable<OrganizationalUnit[]> {
    const url = unitType ? `${this.API_URL}/units?unit_type=${unitType}` : `${this.API_URL}/units`;
    return this.http.get<OrganizationalUnit[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getOrganizationalUnit(id: number): Observable<OrganizationalUnit> {
    return this.http.get<OrganizationalUnit>(`${this.API_URL}/units/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateOrganizationalUnit(unitId: number, unitData: any): Observable<OrganizationalUnit> {
    return this.http.put<OrganizationalUnit>(`${this.API_URL}/units/${unitId}`, unitData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  deleteOrganizationalUnit(unitId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/units/${unitId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getHierarchyTree(unitType?: string): Observable<HierarchyNode[]> {
    const params = unitType ? `?unit_type=${unitType}` : '';
    return this.http.get<HierarchyNode[]>(`${this.API_URL}/units/hierarchy${params}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // User Assignment Methods
  assignUserToUnit(assignment: Partial<UserAssignment>): Observable<UserAssignment> {
    return this.http.post<UserAssignment>(`${this.API_URL}/assignments`, assignment, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getUserAssignments(userId: number): Observable<UserAssignment[]> {
    return this.http.get<UserAssignment[]>(`${this.API_URL}/assignments/user/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getAllAssignments(): Observable<UserAssignment[]> {
    return this.http.get<UserAssignment[]>(`${this.API_URL}/assignments`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getUnitUsers(unitId: number): Observable<UserAssignment[]> {
    return this.http.get<UserAssignment[]>(`${this.API_URL}/assignments/unit/${unitId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  updateUserAssignment(id: number, assignment: Partial<UserAssignment>): Observable<UserAssignment> {
    return this.http.put<UserAssignment>(`${this.API_URL}/assignments/${id}`, assignment, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  removeUserFromUnit(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/assignments/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Office Location Methods
  createOfficeLocation(location: Partial<OfficeLocation>): Observable<OfficeLocation> {
    return this.http.post<OfficeLocation>(`${this.API_URL}/office-locations`, location, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getOfficeLocations(): Observable<OfficeLocation[]> {
    return this.http.get<OfficeLocation[]>(`${this.API_URL}/office-locations`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateOfficeLocation(id: number, location: Partial<OfficeLocation>): Observable<OfficeLocation> {
    return this.http.put<OfficeLocation>(`${this.API_URL}/office-locations/${id}`, location, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteOfficeLocation(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/office-locations/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Attendance Rule Methods
  createAttendanceRule(rule: Partial<AttendanceRule>): Observable<AttendanceRule> {
    return this.http.post<AttendanceRule>(`${this.API_URL}/attendance-rules`, rule, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAttendanceRules(): Observable<AttendanceRule[]> {
    return this.http.get<AttendanceRule[]>(`${this.API_URL}/attendance-rules`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateAttendanceRule(id: number, rule: Partial<AttendanceRule>): Observable<AttendanceRule> {
    return this.http.put<AttendanceRule>(`${this.API_URL}/attendance-rules/${id}`, rule, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteAttendanceRule(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/attendance-rules/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Attendance Methods
  checkIn(checkInData: CheckInRequest): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.API_URL}/attendance/check-in`, checkInData, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  checkOut(checkOutData: CheckOutRequest): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.API_URL}/attendance/check-out`, checkOutData, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAttendanceRecords(userId: number, startDate: string, endDate: string, page: number = 1, limit: number = 50): Observable<Attendance[]> {
    const params = `?start_date=${startDate}&end_date=${endDate}&page=${page}&limit=${limit}`;
    return this.http.get<Attendance[]>(`${this.API_URL}/attendance/my${params}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getTodayAttendance(): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.API_URL}/attendance/today`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getCurrentUserAttendance(): Observable<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];
    const user = this.authService.getCurrentUserValue();
    if (!user) return throwError(() => new Error('No current user'));
    
    return this.getAttendanceRecords(user.id, today, today)
      .pipe(
        map(records => records && records.length > 0 ? records[0] : null),
        catchError(this.handleError)
      );
  }

  // Statistics Methods
  getOrganizationStats(): Observable<OrganizationStats> {
    return this.http.get<OrganizationStats>(`${this.API_URL}/stats`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Geolocation Utilities
  getCurrentLocation(): Promise<{latitude: number, longitude: number}> {
    return new Promise((resolve, reject) => {
      // Mock GPS coordinates for development (when GPS is not working)
      const mockLocation = {
        latitude: 14.4426,  // San Francisco coordinates as example
        longitude: 79.9865
      };
      
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported, using mock location');
        resolve(mockLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn(`Geolocation error: ${error.message}, using mock location`);
          resolve(mockLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,  // Reduced timeout to fail faster to mock
          maximumAge: 60000
        }
      );
    });
  }

  // Distance calculation utility
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  }

  // Attendance Reports - alias for getAttendanceRecords with filtering support
  getAttendanceReports(filters: {
    start_date?: string;
    end_date?: string;
    organizational_unit_id?: number;
    status?: string;
    work_type?: string;
  }): Observable<AttendanceReport[]> {
    const user = this.authService.getCurrentUserValue();
    if (!user) return throwError(() => new Error('No current user'));

    // For now, use the same endpoint but map to AttendanceReport format
    const startDate = filters.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.end_date || new Date().toISOString().split('T')[0];
    
    return this.getAttendanceRecords(user.id, startDate, endDate)
      .pipe(
        map(records => records.map(record => ({
          date: record.check_in_time.split('T')[0],
          user_id: record.user_id,
          user_name: user.first_name + ' ' + user.last_name,
          organizational_unit_id: record.organizational_unit_id,
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
          status: record.attendance_status,
          work_type: record.work_type,
          total_hours: this.calculateTotalHours(record.check_in_time, record.check_out_time),
          notes: record.notes
        }))),
        catchError(this.handleError)
      );
  }

  private calculateTotalHours(checkIn: string, checkOut?: string): number {
    if (!checkOut) return 0;
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }
}