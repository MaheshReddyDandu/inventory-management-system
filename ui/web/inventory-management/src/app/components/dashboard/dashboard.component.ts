import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { OrganizationService, OrganizationStats, Attendance } from '../../services/organization.service';
import { Router } from '@angular/router';

interface DashboardStats {
  totalUsers: number;
  totalUnits: number;
  totalLocations: number;
  todayAttendance: number;
  checkedInUsers: number;
  lateUsers: number;
  remoteUsers: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  roles: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  isLoading = false;
  stats: DashboardStats = {
    totalUsers: 0,
    totalUnits: 0,
    totalLocations: 0,
    todayAttendance: 0,
    checkedInUsers: 0,
    lateUsers: 0,
    remoteUsers: 0
  };
  
  todayAttendance: Attendance | null = null;
  recentAttendance: Attendance[] = [];
  
  quickActions: QuickAction[] = [
    {
      title: 'Check Attendance',
      description: 'Mark your check-in/out for today',
      icon: 'icon-calendar',
      route: '/attendance/check',
      color: 'blue',
      roles: ['user', 'manager', 'admin']
    },
    {
      title: 'Organization Units',
      description: 'Manage organizational structure',
      icon: 'icon-organization',
      route: '/organization/units',
      color: 'purple',
      roles: ['manager', 'admin']
    },
    {
      title: 'User Assignments',
      description: 'Assign users to units',
      icon: 'icon-users',
      route: '/organization/assignments',
      color: 'green',
      roles: ['manager', 'admin']
    },
    {
      title: 'Office Locations',
      description: 'Manage office locations and geofencing',
      icon: 'icon-location',
      route: '/organization/locations',
      color: 'red',
      roles: ['manager', 'admin']
    },
    {
      title: 'Attendance Rules',
      description: 'Configure attendance policies',
      icon: 'icon-rules',
      route: '/attendance/rules',
      color: 'orange',
      roles: ['admin']
    },
    {
      title: 'Attendance Reports',
      description: 'View attendance analytics',
      icon: 'icon-chart',
      route: '/attendance/reports',
      color: 'indigo',
      roles: ['manager', 'admin']
    },
    {
      title: 'User Management',
      description: 'Manage system users',
      icon: 'icon-admin',
      route: '/admin/users',
      color: 'gray',
      roles: ['admin']
    },
    {
      title: 'Role Management',
      description: 'Configure user roles and permissions',
      icon: 'icon-shield',
      route: '/admin/roles',
      color: 'gray',
      roles: ['admin']
    }
  ];

  constructor(
    private authService: AuthService, 
    private organizationService: OrganizationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDashboardData();
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    Promise.all([
      this.loadStats(),
      this.loadTodayAttendance(),
      this.loadRecentAttendance()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  loadStats(): Promise<void> {
    return new Promise((resolve) => {
      // Load organization stats if user is manager or admin
      if (this.isManagerOrAdmin) {
        this.organizationService.getOrganizationStats().subscribe({
          next: (orgStats) => {
            this.stats = {
              ...this.stats,
              totalUsers: orgStats.total_users,
              totalUnits: orgStats.total_units,
              todayAttendance: orgStats.active_attendance_today,
              totalLocations: 0, // Will be loaded separately
              checkedInUsers: 0, // Will be calculated from attendance data
              lateUsers: 0,
              remoteUsers: 0
            };
            resolve();
          },
          error: () => resolve()
        });
      } else {
        resolve();
      }
    });
  }

  loadTodayAttendance(): Promise<void> {
    return new Promise((resolve) => {
      if (this.currentUser) {
        this.organizationService.getCurrentUserAttendance().subscribe({
          next: (attendance) => {
            if (attendance && Array.isArray(attendance) && attendance.length > 0) {
              this.todayAttendance = attendance[0];
            }
            resolve();
          },
          error: () => resolve()
        });
      } else {
        resolve();
      }
    });
  }

  loadRecentAttendance(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isManagerOrAdmin) {
        this.organizationService.getTodayAttendance().subscribe({
          next: (attendance) => {
            this.recentAttendance = attendance.slice(0, 5);
            // Calculate stats from attendance data
            this.calculateAttendanceStats(attendance);
            resolve();
          },
          error: () => resolve()
        });
      } else {
        resolve();
      }
    });
  }

  calculateAttendanceStats(attendance: Attendance[]): void {
    this.stats.checkedInUsers = attendance.filter(a => a.check_in_time && !a.check_out_time).length;
    this.stats.lateUsers = attendance.filter(a => a.attendance_status === 'late').length;
    this.stats.remoteUsers = attendance.filter(a => a.work_type === 'remote').length;
  }

  getAvailableActions(): QuickAction[] {
    if (!this.currentUser) return [];
    
    const userRole = this.currentUser.role.name;
    return this.quickActions.filter(action => action.roles.includes(userRole));
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getAttendanceStatus(): string {
    if (!this.todayAttendance) return 'Not checked in';
    if (this.todayAttendance.check_out_time) return 'Checked out';
    return 'Checked in';
  }

  getAttendanceStatusClass(): string {
    if (!this.todayAttendance) return 'status-absent';
    if (this.todayAttendance.check_out_time) return 'status-complete';
    return 'status-present';
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getWorkDuration(): string {
    if (!this.todayAttendance || !this.todayAttendance.check_in_time) {
      return '--';
    }

    const checkIn = new Date(this.todayAttendance.check_in_time);
    const checkOut = this.todayAttendance.check_out_time 
      ? new Date(this.todayAttendance.check_out_time)
      : new Date();

    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}h ${diffMinutes}m`;
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  goToChangePassword(): void {
    this.router.navigate(['/change-password']);
  }

  navigateToAction(route: string): void {
    this.router.navigate([route]);
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  get currentUserName(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.first_name} ${this.currentUser.last_name}`;
  }
} 