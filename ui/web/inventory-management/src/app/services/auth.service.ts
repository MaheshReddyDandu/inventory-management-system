import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  id: number;
  uuid: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  product_id: string;
  is_active: boolean;
  is_verified: boolean;
  role: Role;
  created_at: string;
  last_login: string | null;
  organizational_assignments?: any[];
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_id?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/api/v1';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = this.getAccessToken();
    const user = this.getStoredUser();
    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  // Authentication Methods
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(this.handleError)
      );
  }

  signup(userData: SignupRequest): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/auth/signup`, userData)
      .pipe(catchError(this.handleError));
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    // Clear tokens and user data immediately
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    if (refreshToken) {
      return this.http.post(`${this.API_URL}/auth/logout`, { refresh_token: refreshToken })
        .pipe(
          catchError(this.handleError)
        );
    } else {
      return new Observable(observer => observer.next({}));
    }
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<any>(`${this.API_URL}/auth/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);
        }),
        catchError(this.handleError)
      );
  }

  // Password Reset Methods
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, {
      token,
      new_password: newPassword
    }).pipe(catchError(this.handleError));
  }

  // User Profile Methods
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/me`)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          this.storeUser(user);
        }),
        catchError(this.handleError)
      );
  }

  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/change-password`, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/auth/users`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Token Management
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  // HTTP Interceptor Helper
  getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Private Helper Methods
  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
    this.storeUser(response.user);
  }

  private handleLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private storeUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
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

    console.error('Auth Service Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Utility Methods
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUserValue();
    return user?.role?.name === role;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUserValue();
    return user?.role?.name === 'admin';
  }

  isManagerOrAdmin(): boolean {
    const user = this.getCurrentUserValue();
    return user?.role?.name === 'admin' || user?.role?.name === 'manager';
  }

  isManager(): boolean {
    return this.hasRole('manager');
  }

  isUser(): boolean {
    return this.hasRole('user');
  }
} 