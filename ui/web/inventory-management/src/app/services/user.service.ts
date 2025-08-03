import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface User {
  id: number;
  uuid?: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  product_id?: string;
  is_active: boolean;
  is_verified: boolean;
  role: { id: number; name: string; description?: string | null; permissions?: string | null };
  organizational_assignments?: UserAssignment[];
  created_at?: string;
  last_login?: string | null;
}

export interface UserAssignment {
  id: number;
  organizational_unit_id: number;
  organizational_unit_name: string;
  organizational_unit_type: string;
  role_in_unit: string;
  is_primary: boolean;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationalUnitOption {
  id: number;
  name: string;
  unit_type: string;
  code: string;
  description?: string;
}

export interface UserAssignmentCreate {
  organizational_unit_id: number;
  role_in_unit: string;
  is_primary: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_id: number;
  organizational_assignments?: UserAssignmentCreate[];
  is_active?: boolean;
  is_verified?: boolean;
}

export interface UserUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  role_id?: number;
  organizational_assignments?: UserAssignmentCreate[];
  is_active?: boolean;
  is_verified?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/auth/users`).pipe(
      catchError(this.handleError)
    );
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/auth/admin/roles`).pipe(
      catchError(this.handleError)
    );
  }

  getOrganizationalUnits(): Observable<OrganizationalUnitOption[]> {
    return this.http.get<OrganizationalUnitOption[]>(`${this.API_URL}/auth/admin/organizational-units`).pipe(
      catchError(this.handleError)
    );
  }

  getOrganizationalUnitsByType(unitType: string): Observable<OrganizationalUnitOption[]> {
    return this.http.get<OrganizationalUnitOption[]>(`${this.API_URL}/auth/admin/organizational-units/${unitType}`).pipe(
      catchError(this.handleError)
    );
  }

  createUser(data: UserCreateData): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/auth/admin/users`, data).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, data: UserUpdateData): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/auth/admin/users/${id}`, data).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/auth/admin/users/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    let errorMessage = 'An error occurred';
    if (error.error?.detail) {
      errorMessage = error.error.detail;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    console.error('User Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
} 