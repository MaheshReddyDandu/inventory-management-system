import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/auth/login/login.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { authGuard } from './guards/auth.guard';
import { AdminUserManagementComponent } from './components/admin-management/admin-user-management.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  
  // Admin Management Routes
  {
    path: 'admin/users',
    loadComponent: () => import('./components/admin-management/admin-user-management.component').then(m => m.AdminUserManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/roles',
    loadComponent: () => import('./components/admin-management/admin-role-management.component').then(m => m.AdminRoleManagementComponent),
    canActivate: [authGuard]
  },
  
  // Organization Management Routes
  {
    path: 'organization/units',
    loadComponent: () => import('./components/organization/organization-management.component').then(m => m.OrganizationManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/branches',
    loadComponent: () => import('./components/organization/branches-management.component').then(m => m.BranchesManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/clients',
    loadComponent: () => import('./components/organization/clients-management.component').then(m => m.ClientsManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/departments',
    loadComponent: () => import('./components/organization/departments-management.component').then(m => m.DepartmentsManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/projects',
    loadComponent: () => import('./components/organization/projects-management.component').then(m => m.ProjectsManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/assignments',
    loadComponent: () => import('./components/organization/user-assignment.component').then(m => m.UserAssignmentComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organization/locations',
    loadComponent: () => import('./components/organization/office-location.component').then(m => m.OfficeLocationComponent),
    canActivate: [authGuard]
  },
  
  // Attendance Management Routes
  {
    path: 'attendance/check',
    loadComponent: () => import('./components/attendance/attendance-check.component').then(m => m.AttendanceCheckComponent),
    canActivate: [authGuard]
  },
  {
    path: 'attendance/rules',
    loadComponent: () => import('./components/attendance/attendance-rules.component').then(m => m.AttendanceRulesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'attendance/reports',
    loadComponent: () => import('./components/attendance/attendance-reports.component').then(m => m.AttendanceReportsComponent),
    canActivate: [authGuard]
  },
  
  { path: '**', redirectTo: '' }
];
