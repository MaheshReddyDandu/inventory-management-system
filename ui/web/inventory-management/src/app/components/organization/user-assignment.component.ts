import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { 
  OrganizationService, 
  OrganizationalUnit,
  UserAssignment 
} from '../../services/organization.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-user-assignment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-assignment.component.html',
  styleUrls: ['./user-assignment.component.scss']
})
export class UserAssignmentComponent implements OnInit, OnDestroy {
  assignments: UserAssignment[] = [];
  users: User[] = [];
  organizationalUnits: OrganizationalUnit[] = [];
  filteredAssignments: UserAssignment[] = [];
  
  assignmentForm: FormGroup;
  editingAssignment: UserAssignment | null = null;
  isModalOpen = false;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  selectedUnitId = '';
  selectedUserId = '';
  searchTerm = '';
  selectedStatus = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  
  // Bulk operations
  selectedAssignments: Set<number> = new Set();
  isBulkMode = false;
  
  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired', label: 'Expired' },
    { value: 'primary', label: 'Primary' }
  ];

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.assignmentForm = this.createForm();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.applyFilters();
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      user_id: ['', Validators.required],
      organizational_unit_id: ['', Validators.required],
      role_in_unit: ['', Validators.required],
      is_primary: [false],
      start_date: [new Date().toISOString().split('T')[0], Validators.required],
      end_date: [''],
      notes: ['']
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    Promise.all([
      this.loadAssignments(),
      this.loadUsers(),
      this.loadOrganizationalUnits()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  loadAssignments(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getAllAssignments()
        .subscribe({
          next: (assignments) => {
            this.assignments = assignments;
            this.totalItems = assignments.length;
            this.applyFilters();
            resolve();
          },
          error: (error) => {
            console.error('Failed to load assignments:', error);
            this.errorMessage = 'Failed to load assignments. Please try again.';
            reject(error);
          }
        });
    });
  }

  loadUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authService.getUsers()
        .subscribe({
          next: (users) => {
            this.users = users.filter(user => user.is_active);
            resolve();
          },
          error: (error) => {
            console.error('Failed to load users:', error);
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
            this.organizationalUnits = units.filter(unit => unit.is_active);
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
    let filtered = [...this.assignments];
    
    // Filter by unit
    if (this.selectedUnitId) {
      filtered = filtered.filter(assignment => 
        assignment.organizational_unit_id.toString() === this.selectedUnitId
      );
    }
    
    // Filter by user
    if (this.selectedUserId) {
      filtered = filtered.filter(assignment => 
        assignment.user_id.toString() === this.selectedUserId
      );
    }
    
    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(assignment => {
        switch (this.selectedStatus) {
          case 'active':
            return assignment.is_active && !this.isExpired(assignment);
          case 'inactive':
            return !assignment.is_active;
          case 'expired':
            return this.isExpired(assignment);
          case 'primary':
            return assignment.is_primary;
          default:
            return true;
        }
      });
    }
    
    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(assignment => 
        assignment.role_in_unit?.toLowerCase().includes(term) ||
        this.getUserName(assignment.user_id).toLowerCase().includes(term) ||
        this.getUnitName(assignment.organizational_unit_id).toLowerCase().includes(term) ||
        this.getUserEmail(assignment.user_id).toLowerCase().includes(term)
      );
    }
    
    this.filteredAssignments = filtered;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.selectedUnitId = '';
    this.selectedUserId = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  getStatusLabel(statusValue: string): string {
    const option = this.statusOptions.find(s => s.value === statusValue);
    return option ? option.label : statusValue;
  }

  openCreateModal(): void {
    this.editingAssignment = null;
    this.assignmentForm.reset();
    this.assignmentForm.patchValue({
      start_date: new Date().toISOString().split('T')[0],
      is_primary: false,
      role_in_unit: ''
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(assignment: UserAssignment): void {
    this.editingAssignment = assignment;
    this.assignmentForm.patchValue({
      user_id: assignment.user_id,
      organizational_unit_id: assignment.organizational_unit_id,
      role_in_unit: assignment.role_in_unit || '',
      start_date: assignment.start_date.split('T')[0],
      end_date: assignment.end_date ? assignment.end_date.split('T')[0] : '',
      is_primary: assignment.is_primary,
      notes: assignment.notes || ''
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingAssignment = null;
    this.assignmentForm.reset();
  }

  onSubmit(): void {
    if (this.assignmentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    const formData = this.assignmentForm.value;
    
    // Add product_id from current user
    formData.product_id = this.authService.getCurrentUserValue()?.product_id;

    const operation = this.editingAssignment 
      ? this.organizationService.updateUserAssignment(this.editingAssignment.id, formData)
      : this.organizationService.assignUserToUnit(formData);

    operation.subscribe({
      next: (assignment) => {
        this.successMessage = this.editingAssignment 
          ? 'Assignment updated successfully!' 
          : 'User assigned successfully!';
        
        // Update local assignments
        if (this.editingAssignment) {
          const index = this.assignments.findIndex(a => a.id === this.editingAssignment!.id);
          if (index >= 0) {
            this.assignments[index] = assignment;
          }
        } else {
          this.assignments.unshift(assignment);
        }
        
        this.applyFilters();
        this.closeModal();
        this.isSubmitting = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || error.message || 'An error occurred. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  removeAssignment(assignment: UserAssignment): void {
    const userName = this.getUserName(assignment.user_id);
    const unitName = this.getUnitName(assignment.organizational_unit_id);
    
    if (!confirm(`Are you sure you want to remove ${userName} from ${unitName}? This action cannot be undone.`)) {
      return;
    }

    this.isLoading = true;
    this.organizationService.removeUserFromUnit(assignment.id)
      .subscribe({
        next: () => {
          this.successMessage = 'Assignment removed successfully!';
          this.assignments = this.assignments.filter(a => a.id !== assignment.id);
          this.applyFilters();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 5000);
        },
        error: (error) => {
          this.errorMessage = error.error?.detail || error.message || 'Failed to remove assignment.';
          this.isLoading = false;
        }
      });
  }

  // Bulk operations
  toggleBulkMode(): void {
    this.isBulkMode = !this.isBulkMode;
    this.selectedAssignments.clear();
  }

  toggleAssignmentSelection(assignmentId: number): void {
    if (this.selectedAssignments.has(assignmentId)) {
      this.selectedAssignments.delete(assignmentId);
    } else {
      this.selectedAssignments.add(assignmentId);
    }
  }

  selectAllAssignments(): void {
    if (this.selectedAssignments.size === this.filteredAssignments.length) {
      this.selectedAssignments.clear();
    } else {
      this.filteredAssignments.forEach(assignment => {
        this.selectedAssignments.add(assignment.id);
      });
    }
  }

  bulkRemoveAssignments(): void {
    if (this.selectedAssignments.size === 0) return;
    
    const count = this.selectedAssignments.size;
    if (!confirm(`Are you sure you want to remove ${count} assignment(s)? This action cannot be undone.`)) {
      return;
    }

    this.isLoading = true;
    const promises = Array.from(this.selectedAssignments).map(id => 
      this.organizationService.removeUserFromUnit(id).toPromise()
    );

    Promise.all(promises)
      .then(() => {
        this.successMessage = `${count} assignment(s) removed successfully!`;
        this.assignments = this.assignments.filter(a => !this.selectedAssignments.has(a.id));
        this.selectedAssignments.clear();
        this.isBulkMode = false;
        this.applyFilters();
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 5000);
      })
      .catch(error => {
        this.errorMessage = 'Some assignments could not be removed. Please try again.';
        this.isLoading = false;
      });
  }

  // Utility methods
  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : `User ${userId}`;
  }

  getUserEmail(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.email : '';
  }

  getUnitName(unitId: number): string {
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.name : `Unit ${unitId}`;
  }

  getUnitType(unitId: number): string {
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.unit_type : '';
  }

  isExpired(assignment: UserAssignment): boolean {
    return assignment.end_date ? new Date(assignment.end_date) < new Date() : false;
  }

  getAssignmentStatusClass(assignment: UserAssignment): string {
    if (!assignment.is_active) return 'status-inactive';
    if (this.isExpired(assignment)) return 'status-expired';
    if (assignment.is_primary) return 'status-primary';
    return 'status-active';
  }

  getAssignmentStatusText(assignment: UserAssignment): string {
    if (!assignment.is_active) return 'Inactive';
    if (this.isExpired(assignment)) return 'Expired';
    if (assignment.is_primary) return 'Primary';
    return 'Active';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysRemaining(assignment: UserAssignment): number {
    if (!assignment.end_date) return -1;
    const endDate = new Date(assignment.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Form validation
  private markFormGroupTouched(): void {
    Object.keys(this.assignmentForm.controls).forEach(key => {
      const control = this.assignmentForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.assignmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.assignmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'user_id': 'User',
      'organizational_unit_id': 'Organizational Unit',
      'role_in_unit': 'Role',
      'start_date': 'Start Date'
    };
    return labels[fieldName] || fieldName;
  }

  // Access control
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  // Tracking
  trackByAssignment(index: number, assignment: UserAssignment): number {
    return assignment.id;
  }

  trackByUser(index: number, user: User): number {
    return user.id;
  }

  trackByUnit(index: number, unit: OrganizationalUnit): number {
    return unit.id;
  }
}