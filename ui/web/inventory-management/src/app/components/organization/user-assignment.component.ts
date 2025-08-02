import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
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
export class UserAssignmentComponent implements OnInit {
  assignments: UserAssignment[] = [];
  users: User[] = [];
  organizationalUnits: OrganizationalUnit[] = [];
  filteredAssignments: UserAssignment[] = [];
  
  assignmentForm: FormGroup;
  editingAssignment: UserAssignment | null = null;
  isModalOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  selectedUnitId = '';
  selectedUserId = '';
  searchTerm = '';
  
  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.assignmentForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  createForm(): FormGroup {
    return this.fb.group({
      user_id: ['', Validators.required],
      organizational_unit_id: ['', Validators.required],
      position: [''],
      start_date: [new Date().toISOString().split('T')[0], Validators.required],
      end_date: [''],
      is_primary: [false]
    });
  }

  loadData(): void {
    this.isLoading = true;
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
      // Since we don't have a get all assignments endpoint, we'll need to load them differently
      // For now, we'll start with an empty array and load specific user assignments
      this.assignments = [];
      this.applyFilters();
      resolve();
    });
  }

  loadUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Assuming we have a getUsers method in AuthService or similar
      // For now, we'll use a placeholder
      this.users = [];
      resolve();
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

  loadUserAssignments(userId: number): void {
    this.organizationService.getUserAssignments(userId)
      .subscribe({
        next: (assignments) => {
          // Merge with existing assignments, avoiding duplicates
          assignments.forEach(assignment => {
            const existingIndex = this.assignments.findIndex(a => a.id === assignment.id);
            if (existingIndex >= 0) {
              this.assignments[existingIndex] = assignment;
            } else {
              this.assignments.push(assignment);
            }
          });
          this.applyFilters();
        },
        error: (error) => {
          console.error('Failed to load user assignments:', error);
        }
      });
  }

  loadUnitUsers(unitId: number): void {
    this.organizationService.getUnitUsers(unitId)
      .subscribe({
        next: (assignments) => {
          // Merge with existing assignments, avoiding duplicates
          assignments.forEach(assignment => {
            const existingIndex = this.assignments.findIndex(a => a.id === assignment.id);
            if (existingIndex >= 0) {
              this.assignments[existingIndex] = assignment;
            } else {
              this.assignments.push(assignment);
            }
          });
          this.applyFilters();
        },
        error: (error) => {
          console.error('Failed to load unit users:', error);
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.assignments];
    
    if (this.selectedUnitId) {
      filtered = filtered.filter(assignment => 
        assignment.organizational_unit_id.toString() === this.selectedUnitId
      );
    }
    
    if (this.selectedUserId) {
      filtered = filtered.filter(assignment => 
        assignment.user_id.toString() === this.selectedUserId
      );
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(assignment => 
        assignment.position?.toLowerCase().includes(term) ||
        this.getUserName(assignment.user_id).toLowerCase().includes(term) ||
        this.getUnitName(assignment.organizational_unit_id).toLowerCase().includes(term)
      );
    }
    
    this.filteredAssignments = filtered;
  }

  onFilterChange(): void {
    if (this.selectedUnitId) {
      this.loadUnitUsers(parseInt(this.selectedUnitId));
    }
    if (this.selectedUserId) {
      this.loadUserAssignments(parseInt(this.selectedUserId));
    }
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingAssignment = null;
    this.assignmentForm.reset();
    this.assignmentForm.patchValue({
      start_date: new Date().toISOString().split('T')[0],
      is_primary: false
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
      position: assignment.position,
      start_date: assignment.start_date.split('T')[0],
      end_date: assignment.end_date ? assignment.end_date.split('T')[0] : '',
      is_primary: assignment.is_primary
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

    this.isLoading = true;
    const formData = this.assignmentForm.value;

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
          this.assignments.push(assignment);
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

  removeAssignment(assignment: UserAssignment): void {
    if (!confirm(`Are you sure you want to remove this assignment? This action cannot be undone.`)) {
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
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : `User ${userId}`;
  }

  getUnitName(unitId: number): string {
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.name : `Unit ${unitId}`;
  }

  getUnitType(unitId: number): string {
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.unit_type : '';
  }

  getAssignmentStatusClass(assignment: UserAssignment): string {
    if (!assignment.is_active) return 'status-inactive';
    if (assignment.end_date && new Date(assignment.end_date) < new Date()) return 'status-expired';
    if (assignment.is_primary) return 'status-primary';
    return 'status-active';
  }

  getAssignmentStatusText(assignment: UserAssignment): string {
    if (!assignment.is_active) return 'Inactive';
    if (assignment.end_date && new Date(assignment.end_date) < new Date()) return 'Expired';
    if (assignment.is_primary) return 'Primary';
    return 'Active';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

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
      if (field.errors['required']) return `${fieldName} is required`;
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  trackByAssignment(index: number, assignment: UserAssignment): number {
    return assignment.id;
  }
}