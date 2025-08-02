import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { 
  OrganizationService, 
  OrganizationalUnit,
  Attendance,
  CheckInRequest,
  CheckOutRequest 
} from '../../services/organization.service';
import { AuthService, User } from '../../services/auth.service';
import { AttendanceStateService, AttendanceState } from '../../services/attendance-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-attendance-check',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-check.component.html',
  styleUrls: ['./attendance-check.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        height: '*',
        opacity: 1,
        overflow: 'visible'
      })),
      state('out', style({
        height: '0px',
        opacity: 0,
        overflow: 'hidden'
      })),
      transition('in => out', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in-out', style({
          height: '0px',
          opacity: 0
        }))
      ]),
      transition('out => in', [
        style({ 
          height: '0px', 
          opacity: 0, 
          overflow: 'hidden' 
        }),
        animate('300ms ease-in-out', style({
          height: '*',
          opacity: 1
        })),
        style({ overflow: 'visible' })
      ])
    ])
  ]
})
export class AttendanceCheckComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  attendanceState: AttendanceState | null = null;
  organizationalUnits: OrganizationalUnit[] = [];
  private subscription = new Subscription();
  
  // Collapsible date sections state
  collapsedDates: Set<string> = new Set(); // Track which dates are collapsed
  
  checkInForm: FormGroup;
  checkOutForm: FormGroup;
  
  isLoading = false;
  isLocationLoading = false;
  errorMessage = '';
  successMessage = '';
  
  currentLocation: { latitude: number; longitude: number; address?: string } | null = null;
  
  workTypes = [
    { value: 'office', label: 'Office Work' },
    { value: 'remote', label: 'Remote Work' },
    { value: 'client-site', label: 'Client Site' },
    { value: 'travel', label: 'Travel' }
  ];

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private attendanceStateService: AttendanceStateService,
    private fb: FormBuilder
  ) {
    this.checkInForm = this.createCheckInForm();
    this.checkOutForm = this.createCheckOutForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.loadOrganizationalUnits();
    this.getCurrentLocation();
    
    // Subscribe to attendance state
    this.subscription.add(
      this.attendanceStateService.attendanceState$.subscribe(state => {
        this.attendanceState = state;
      })
    );

    // Set up scroll listener for infinite loading
    this.setupInfiniteScroll();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  createCheckInForm(): FormGroup {
    return this.fb.group({
      organizational_unit_id: [null],
      work_type: ['office', Validators.required],
      location_name: ['', Validators.required],
      notes: ['']
    });
  }

  createCheckOutForm(): FormGroup {
    return this.fb.group({
      notes: [''],
      work_summary: ['']
    });
  }

  loadOrganizationalUnits(): void {
    this.organizationService.getOrganizationalUnits()
      .subscribe({
        next: (units) => {
          this.organizationalUnits = units;
        },
        error: (error) => {
          console.error('Failed to load organizational units:', error);
        }
      });
  }

  // These methods are no longer needed as we use the state service
  // loadTodayAttendance and loadTodaySessions are handled by AttendanceStateService

  getCurrentLocation(): void {
    this.isLocationLoading = true;
    this.organizationService.getCurrentLocation()
      .then((location) => {
        this.currentLocation = location;
        this.isLocationLoading = false;
        
        // Check if this is mock GPS (San Francisco coordinates)
        const isMockGPS = location.latitude === 37.7749 && location.longitude === -122.4194;
        const locationLabel = isMockGPS ? 'Mock GPS Location' : 'Current Location';
        
        // Set location in forms
        this.checkInForm.patchValue({
          location_name: `${locationLabel}: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        });
        
        // Get address from coordinates if possible
        this.getAddressFromCoordinates(location.latitude, location.longitude);
        
        // Show warning if using mock GPS
        if (isMockGPS) {
          console.warn('Using mock GPS coordinates for development');
        }
      })
      .catch((error) => {
        this.errorMessage = `Location access failed: ${error.message}`;
        this.isLocationLoading = false;
      });
  }

  getAddressFromCoordinates(lat: number, lng: number): void {
    // In a real application, you would use a geocoding service
    // For now, we'll just use the coordinates
    if (this.currentLocation) {
      this.currentLocation.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      this.checkInForm.patchValue({
        location_name: this.currentLocation.address
      });
    }
  }

  checkIn(): void {
    if (this.checkInForm.invalid) {
      this.markFormGroupTouched(this.checkInForm);
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.organizationService.getCurrentLocation()
      .then(location => {
        this.currentLocation = location;
        const checkInData: CheckInRequest = {
          ...this.checkInForm.value,
          latitude: location.latitude,
          longitude: location.longitude
        };
        this.organizationService.checkIn(checkInData)
          .subscribe({
            next: (attendance) => {
              console.log('Check-in successful, attendance record:', attendance);
              this.successMessage = 'Checked in successfully!';
              this.isLoading = false;
              setTimeout(() => this.successMessage = '', 3000);
              // Update state service instead of local state
              this.attendanceStateService.updateAfterCheckIn(attendance);
            },
            error: (error) => {
              console.error('Check-in failed:', error);
              this.errorMessage = error.message;
              this.isLoading = false;
            }
          });
      })
      .catch(error => {
        this.errorMessage = `Location access failed: ${error.message}`;
        this.isLoading = false;
      });
  }

  checkOut(): void {
    if (!this.attendanceState?.currentSession?.id) {
      this.errorMessage = 'No active check-in found to check out from';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.organizationService.getCurrentLocation()
      .then(location => {
        this.currentLocation = location;
        const checkOutData: CheckOutRequest = {
          attendance_id: this.attendanceState!.currentSession!.id,
          work_summary: this.checkOutForm.value.notes || '',
          notes: this.checkOutForm.value.notes || '',
          latitude: location.latitude,
          longitude: location.longitude
        };
        this.organizationService.checkOut(checkOutData)
          .subscribe({
            next: (attendance) => {
              this.successMessage = 'Checked out successfully!';
              this.isLoading = false;
              setTimeout(() => this.successMessage = '', 3000);
              // Update state service instead of local state
              this.attendanceStateService.updateAfterCheckOut(attendance);
            },
            error: (error) => {
              this.errorMessage = error.message;
              this.isLoading = false;
            }
          });
      })
      .catch(error => {
        this.errorMessage = `Location access failed: ${error.message}`;
        this.isLoading = false;
      });
  }

  refreshLocation(): void {
    this.getCurrentLocation();
  }

  refreshAttendance(): void {
          // loadTodayAttendance is now handled by AttendanceStateService
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'present': 'status-present',
      'late': 'status-late',
      'absent': 'status-absent',
      'remote': 'status-remote',
      'weekend': 'status-weekend'
    };
    return statusClasses[status] || 'status-default';
  }

  getWorkTypeLabel(workType: string): string {
    const type = this.workTypes.find(t => t.value === workType);
    return type ? type.label : workType;
  }

    calculateWorkDuration(): string {
    const currentSession = this.attendanceState?.currentSession;
    if (!currentSession?.check_in_time) return '--';
    
    const checkIn = new Date(currentSession.check_in_time);
    const checkOut = currentSession.check_out_time
      ? new Date(currentSession.check_out_time)
      : new Date();
    
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  }

  calculateWorkDurationFor(session: Attendance): string {
    if (!session.check_in_time || !session.check_out_time) return '--';
    const checkIn = new Date(session.check_in_time);
    const checkOut = new Date(session.check_out_time);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get isCheckedIn(): boolean {
    return this.attendanceState?.isCheckedIn || false;
  }

  get isCheckedOut(): boolean {
    return !!(this.attendanceState?.todaySessions && 
              this.attendanceState.todaySessions.length > 0 && 
              !this.attendanceState.isCheckedIn);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }

  getGrossHours(): string {
    return this.attendanceState?.totalHoursToday || '0h 0m';
  }

  openMap(lat?: number, lng?: number): void {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  }

  // refreshLocation(): void {
  //   this.getCurrentLocation();
  // }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
    }
    return '';
  }

  getLastCheckOutTime(): string {
    if (!this.attendanceState?.todaySessions || this.attendanceState.todaySessions.length === 0) {
      return '--';
    }
    
    const lastSession = this.attendanceState.todaySessions
      .filter(s => s.check_out_time)
      .sort((a, b) => new Date(b.check_out_time!).getTime() - new Date(a.check_out_time!).getTime())[0];
    
    return lastSession ? this.formatTime(lastSession.check_out_time!) : '--';
  }

  scrollToCheckIn(): void {
    const checkInElement = document.getElementById('check-in-section');
    if (checkInElement) {
      checkInElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToCheckOut(): void {
    const checkOutElement = document.getElementById('check-out-section');
    if (checkOutElement) {
      checkOutElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Group sessions by date for display
  getSessionsByDate(): { date: string, sessions: Attendance[] }[] {
    if (!this.attendanceState?.allSessions) return [];
    
    const sessionGroups: { [key: string]: Attendance[] } = {};
    
    this.attendanceState.allSessions.forEach(session => {
      const sessionDate = new Date(session.check_in_time).toISOString().split('T')[0];
      if (!sessionGroups[sessionDate]) {
        sessionGroups[sessionDate] = [];
      }
      sessionGroups[sessionDate].push(session);
    });
    
    // Convert to array and sort by date (newest first)
    return Object.keys(sessionGroups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        sessions: sessionGroups[date].sort((a, b) => 
          new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
        )
      }));
  }

  // Format date header for display
  formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = date.toISOString().split('T')[0];
    const todayOnly = today.toISOString().split('T')[0];
    const yesterdayOnly = yesterday.toISOString().split('T')[0];
    
    if (dateOnly === todayOnly) {
      return 'Today';
    } else if (dateOnly === yesterdayOnly) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  // Setup infinite scroll functionality
  setupInfiniteScroll(): void {
    window.addEventListener('scroll', () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
        this.loadMoreData();
      }
    });
  }

  // Load more attendance data
  loadMoreData(): void {
    if (this.attendanceState?.hasMoreData && !this.attendanceState?.isLoadingMore) {
      this.attendanceStateService.loadMoreAttendanceData().subscribe();
    }
  }

  // Get date range description for the loaded data
  getDateRangeDescription(): string {
    if (!this.attendanceState?.allSessions || this.attendanceState.allSessions.length === 0) {
      return 'No sessions found';
    }

    const sessions = this.attendanceState.allSessions;
    const oldestSession = sessions[sessions.length - 1];
    const newestSession = sessions[0];

    const oldestDate = new Date(oldestSession.check_in_time);
    const newestDate = new Date(newestSession.check_in_time);
    const today = new Date();

    // Calculate days difference
    const daysDiff = Math.ceil((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      return 'today';
    } else if (daysDiff <= 7) {
      return 'the past week';
    } else if (daysDiff <= 14) {
      return 'the past 2 weeks';
    } else if (daysDiff <= 30) {
      return 'the past month';
    } else {
      return `the past ${Math.ceil(daysDiff / 7)} weeks`;
    }
  }

  // Get oldest session date for display
  getOldestSessionDate(): string {
    if (!this.attendanceState?.allSessions || this.attendanceState.allSessions.length === 0) {
      return '';
    }
    const oldestSession = this.attendanceState.allSessions[this.attendanceState.allSessions.length - 1];
    return new Date(oldestSession.check_in_time).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Get newest session date for display
  getNewestSessionDate(): string {
    if (!this.attendanceState?.allSessions || this.attendanceState.allSessions.length === 0) {
      return '';
    }
    const newestSession = this.attendanceState.allSessions[0];
    return new Date(newestSession.check_in_time).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Collapsible functionality
  toggleDateSection(date: string): void {
    if (this.collapsedDates.has(date)) {
      this.collapsedDates.delete(date);
    } else {
      this.collapsedDates.add(date);
    }
  }

  isDateCollapsed(date: string): boolean {
    return this.collapsedDates.has(date);
  }

  // Expand all sections
  expandAllSections(): void {
    this.collapsedDates.clear();
  }

  // Collapse all sections
  collapseAllSections(): void {
    if (this.attendanceState?.allSessions) {
      const sessionsByDate = this.getSessionsByDate();
      sessionsByDate.forEach(dateGroup => {
        this.collapsedDates.add(dateGroup.date);
      });
    }
  }

  // Calculate total hours for a specific date
  calculateDateTotalHours(sessions: Attendance[]): string {
    let totalMs = 0;
    for (const session of sessions) {
      if (session.check_in_time) {
        const inTime = new Date(session.check_in_time).getTime();
        const outTime = session.check_out_time 
          ? new Date(session.check_out_time).getTime() 
          : new Date().getTime();
        totalMs += outTime - inTime;
      }
    }
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}