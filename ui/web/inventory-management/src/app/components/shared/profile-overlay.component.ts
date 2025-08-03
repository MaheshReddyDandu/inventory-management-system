import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserAssignment } from '../../services/user.service';
import { User } from '../../services/auth.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-overlay.component.html',
  styleUrls: ['./profile-overlay.component.scss']
})
export class ProfileOverlayComponent {
  @Input() isOpen: boolean = false;
  @Input() currentUser: User | null = null;
  @Output() closeOverlay = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();
  @Output() changePasswordRequested = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeOverlay.emit();
    }
  }

  onLogout(): void {
    this.logoutRequested.emit();
  }

  onChangePassword(): void {
    this.changePasswordRequested.emit();
  }

  getUnitTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'branch': return '🏢';
      case 'client': return '🤝';
      case 'department': return '🏛️';
      case 'project': return '📋';
      default: return '🏢';
    }
  }

  getUnitTypeLabel(type: string): string {
    switch (type.toLowerCase()) {
      case 'branch': return 'Branch';
      case 'client': return 'Client';
      case 'department': return 'Department';
      case 'project': return 'Project';
      default: return type;
    }
  }

  getRoleInUnitLabel(role: string): string {
    switch (role.toLowerCase()) {
      case 'manager': return 'Manager';
      case 'member': return 'Member';
      case 'lead': return 'Lead';
      case 'supervisor': return 'Supervisor';
      default: return role;
    }
  }

  getRoleColor(role: string): string {
    switch (role.toLowerCase()) {
      case 'manager': return 'role-manager';
      case 'lead': return 'role-lead';
      case 'supervisor': return 'role-supervisor';
      case 'member': return 'role-member';
      default: return 'role-member';
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getVerificationClass(isVerified: boolean): string {
    return isVerified ? 'status-verified' : 'status-unverified';
  }

  getVerificationText(isVerified: boolean): string {
    return isVerified ? 'Verified' : 'Unverified';
  }

  getSystemRoleClass(roleName: string): string {
    switch (roleName.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'user': return 'role-user';
      default: return 'role-user';
    }
  }

  getSystemRoleIcon(roleName: string): string {
    switch (roleName.toLowerCase()) {
      case 'admin': return '👑';
      case 'manager': return '🛡️';
      case 'user': return '👤';
      default: return '👤';
    }
  }

  getPrimaryAssignments(): UserAssignment[] {
    if (!this.currentUser?.organizational_assignments) return [];
    return this.currentUser.organizational_assignments.filter(assignment => assignment.is_primary);
  }

  getSecondaryAssignments(): UserAssignment[] {
    if (!this.currentUser?.organizational_assignments) return [];
    return this.currentUser.organizational_assignments.filter(assignment => !assignment.is_primary);
  }

  getAssignmentsByType(type: string): UserAssignment[] {
    if (!this.currentUser?.organizational_assignments) return [];
    return this.currentUser.organizational_assignments.filter(assignment => 
      assignment.organizational_unit_type.toLowerCase() === type.toLowerCase()
    );
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.first_name.charAt(0)}${this.currentUser.last_name.charAt(0)}`.toUpperCase();
  }

  getLastLoginText(): string {
    if (!this.currentUser?.last_login) return 'Never';
    const lastLogin = new Date(this.currentUser.last_login);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour(s) ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} day(s) ago`;
    return this.formatDate(this.currentUser.last_login);
  }
} 