import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { 
  OrganizationService, 
  OfficeLocation,
  OrganizationalUnit 
} from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-office-location',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './office-location.component.html',
  styleUrls: ['./office-location.component.scss']
})
export class OfficeLocationComponent implements OnInit {
  locations: OfficeLocation[] = [];
  organizationalUnits: OrganizationalUnit[] = [];
  filteredLocations: OfficeLocation[] = [];
  
  locationForm: FormGroup;
  editingLocation: OfficeLocation | null = null;
  isModalOpen = false;
  isLoading = false;
  isLocationLoading = false;
  errorMessage = '';
  successMessage = '';
  
  selectedUnitId = '';
  searchTerm = '';
  
  currentUserLocation: { latitude: number; longitude: number } | null = null;

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.locationForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      organizational_unit_id: [''],
      address: ['', Validators.required],
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
      radius_meters: [50, [Validators.required, Validators.min(1), Validators.max(10000)]]
    });
  }

  loadData(): void {
    this.isLoading = true;
    Promise.all([
      this.loadLocations(),
      this.loadOrganizationalUnits()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  loadLocations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getOfficeLocations()
        .subscribe({
          next: (locations) => {
            this.locations = locations;
            this.applyFilters();
            resolve();
          },
          error: (error) => {
            this.errorMessage = error.message;
            reject(error);
          }
        });
    });
  }

  loadOrganizationalUnits(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getOrganizationalUnits()
        .subscribe({
          next: (units) => {
            this.organizationalUnits = units;
            resolve();
          },
          error: (error) => {
            console.error('Failed to load organizational units:', error);
            reject(error);
          }
        });
    });
  }

  applyFilters(): void {
    let filtered = [...this.locations];
    
    if (this.selectedUnitId) {
      filtered = filtered.filter(location => 
        location.organizational_unit_id?.toString() === this.selectedUnitId
      );
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(term) ||
        location.address.toLowerCase().includes(term)
      );
    }
    
    this.filteredLocations = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingLocation = null;
    this.locationForm.reset();
    this.locationForm.patchValue({
      radius_meters: 50
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(location: OfficeLocation): void {
    this.editingLocation = location;
    this.locationForm.patchValue({
      name: location.name,
      organizational_unit_id: location.organizational_unit_id || '',
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingLocation = null;
    this.locationForm.reset();
  }

  onSubmit(): void {
    if (this.locationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.locationForm.value;

    const operation = this.editingLocation 
      ? this.organizationService.updateOfficeLocation(this.editingLocation.id, formData)
      : this.organizationService.createOfficeLocation(formData);

    operation.subscribe({
      next: (location) => {
        this.successMessage = this.editingLocation 
          ? 'Location updated successfully!' 
          : 'Location created successfully!';
        
        if (this.editingLocation) {
          const index = this.locations.findIndex(l => l.id === this.editingLocation!.id);
          if (index >= 0) {
            this.locations[index] = location;
          }
        } else {
          this.locations.push(location);
        }
        
        this.applyFilters();
        this.closeModal();
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }

  deleteLocation(location: OfficeLocation): void {
    if (!confirm(`Are you sure you want to delete "${location.name}"? This action cannot be undone.`)) {
      return;
    }

    this.isLoading = true;
    this.organizationService.deleteOfficeLocation(location.id)
      .subscribe({
        next: () => {
          this.successMessage = 'Location deleted successfully!';
          this.locations = this.locations.filter(l => l.id !== location.id);
          this.applyFilters();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  getCurrentLocation(): void {
    this.isLocationLoading = true;
    this.organizationService.getCurrentLocation()
      .then((location) => {
        this.currentUserLocation = location;
        this.locationForm.patchValue({
          latitude: location.latitude,
          longitude: location.longitude
        });
        this.isLocationLoading = false;
      })
      .catch((error) => {
        this.errorMessage = `Location access failed: ${error.message}`;
        this.isLocationLoading = false;
      });
  }

  useCurrentLocation(): void {
    if (this.currentUserLocation) {
      this.locationForm.patchValue({
        latitude: this.currentUserLocation.latitude,
        longitude: this.currentUserLocation.longitude
      });
    } else {
      this.getCurrentLocation();
    }
  }

  getUnitName(unitId: number | undefined): string {
    if (!unitId) return 'No unit assigned';
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.name : `Unit ${unitId}`;
  }

  getStatusClass(location: OfficeLocation): string {
    return location.is_active ? 'status-active' : 'status-inactive';
  }

  calculateDistance(location: OfficeLocation): string {
    if (!this.currentUserLocation) return '--';
    
    const distance = this.organizationService.calculateDistance(
      this.currentUserLocation.latitude,
      this.currentUserLocation.longitude,
      location.latitude,
      location.longitude
    );
    
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }

  isWithinRange(location: OfficeLocation): boolean {
    if (!this.currentUserLocation) return false;
    
    const distance = this.organizationService.calculateDistance(
      this.currentUserLocation.latitude,
      this.currentUserLocation.longitude,
      location.latitude,
      location.longitude
    );
    
    return distance <= location.radius_meters;
  }

  viewOnMap(location: OfficeLocation): void {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.locationForm.controls).forEach(key => {
      const control = this.locationForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.locationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.locationForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  trackByLocation(index: number, location: OfficeLocation): number {
    return location.id;
  }
}