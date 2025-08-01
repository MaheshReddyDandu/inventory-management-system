import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string; // JSON string
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.API_URL}/auth/admin/roles`).pipe(
      catchError(this.handleError)
    );
  }

  getRole(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.API_URL}/auth/admin/roles/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.API_URL}/auth/admin/roles`, role).pipe(
      catchError(this.handleError)
    );
  }

  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.API_URL}/auth/admin/roles/${id}`, role).pipe(
      catchError(this.handleError)
    );
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/auth/admin/roles/${id}`).pipe(
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
    console.error('Role Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }
} 