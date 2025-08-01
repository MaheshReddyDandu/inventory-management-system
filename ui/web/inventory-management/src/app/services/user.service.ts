import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  role: { id: number; name: string };
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

  createUser(data: any): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/auth/admin/users`, data).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, data: any): Observable<User> {
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