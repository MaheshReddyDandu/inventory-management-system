import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  OrganizationService, 
  OrganizationalUnit,
  Attendance,
  CheckInRequest,
  CheckOutRequest 
} from '../../services/organization.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-attendance-check',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-check.component.html',
  styleUrls: ['./attendance-check.component.scss']
})
export class AttendanceCheckComponent implements OnInit {
  currentUser: User | null = null;
  todayAttendance: Attendance | null = null;
  organizationalUnits: OrganizationalUnit[] = [];
  
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
    private fb: FormBuilder
  ) {
    this.checkInForm = this.createCheckInForm();
    this.checkOutForm = this.createCheckOutForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.loadOrganizationalUnits();
    this.loadTodayAttendance();
    this.getCurrentLocation();
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

  loadTodayAttendance(): void {
    if (!this.currentUser) return;
    
    this.organizationService.getCurrentUserAttendance()
      .subscribe({
        next: (attendance) => {
          if (attendance && Array.isArray(attendance) && attendance.length > 0) {
            this.todayAttendance = attendance[0];
          } else {
            this.todayAttendance = null;
          }
        },
        error: (error) => {
          console.error('Failed to load today attendance:', error);
          this.todayAttendance = null;
        }
      });
  }

  getCurrentLocation(): void {
    this.isLocationLoading = true;
    this.organizationService.getCurrentLocation()
      .then((location) => {
        this.currentLocation = location;
        this.isLocationLoading = false;
        
        // Set location in forms
        this.checkInForm.patchValue({
          location_name: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`
        });
        
        // Get address from coordinates if possible
        this.getAddressFromCoordinates(location.latitude, location.longitude);
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
    if (this.checkInForm.invalid || !this.currentLocation) {
      this.markFormGroupTouched(this.checkInForm);
      if (!this.currentLocation) {
        this.errorMessage = 'Location is required for check-in';
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const checkInData: CheckInRequest = {
      ...this.checkInForm.value,
      latitude: this.currentLocation.latitude,
      longitude: this.currentLocation.longitude
    };

    this.organizationService.checkIn(checkInData)
      .subscribe({
        next: (attendance) => {
          this.todayAttendance = attendance;
          this.successMessage = 'Checked in successfully!';
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  checkOut(): void {
    if (!this.todayAttendance || !this.todayAttendance.id) {
      this.errorMessage = 'No active check-in found to check out from';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const checkOutData: CheckOutRequest = {
      attendance_id: this.todayAttendance.id,
      work_summary: this.checkOutForm.value.notes || '',
      notes: this.checkOutForm.value.notes || ''
    };

    this.organizationService.checkOut(checkOutData)
      .subscribe({
        next: (attendance) => {
          this.todayAttendance = attendance;
          this.successMessage = 'Checked out successfully!';
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  refreshLocation(): void {
    this.getCurrentLocation();
  }

  refreshAttendance(): void {
    this.loadTodayAttendance();
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
    if (!this.todayAttendance?.check_in_time) return '--';
    
    const checkIn = new Date(this.todayAttendance.check_in_time);
    const checkOut = this.todayAttendance.check_out_time 
      ? new Date(this.todayAttendance.check_out_time)
      : new Date();

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
    return !!(this.todayAttendance &&
           this.todayAttendance.check_in_time &&
           !this.todayAttendance.check_out_time);
  }

  get isCheckedOut(): boolean {
    return !!(this.todayAttendance &&
           this.todayAttendance.check_in_time &&
           this.todayAttendance.check_out_time);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString();
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}