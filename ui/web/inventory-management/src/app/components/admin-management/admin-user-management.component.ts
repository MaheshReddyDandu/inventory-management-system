import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { UserService, User, UserCreateData, UserUpdateData, OrganizationalUnitOption, UserAssignmentCreate } from '../../services/user.service';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-user-management.component.html',
  styleUrls: ['./admin-user-management.component.scss']
})
export class AdminUserManagementComponent implements OnInit {
  users: User[] = [];
  roles: any[] = [];
  organizationalUnits: OrganizationalUnitOption[] = [];
  userForm!: FormGroup;
  editingUser: User | null = null;
  loading = false;
  error = '';
  success = '';
  showAdvancedOptions = false;
  selectedUnitType = 'all';

  // Unit type options for filtering
  unitTypes = [
    { value: 'all', label: 'All Units' },
    { value: 'branch', label: 'Branches' },
    { value: 'client', label: 'Clients' },
    { value: 'department', label: 'Departments' },
    { value: 'project', label: 'Projects' }
  ];

  // Role in unit options
  roleInUnitOptions = [
    { value: 'member', label: 'Member' },
    { value: 'manager', label: 'Manager' },
    { value: 'lead', label: 'Lead' },
    { value: 'supervisor', label: 'Supervisor' }
  ];

  constructor(private userService: UserService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadOrganizationalUnits();
    this.initForm();
  }

  private initForm() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.minLength(8)]],
      role_id: ['', Validators.required],
      is_active: [true],
      is_verified: [false],
      organizational_assignments: this.fb.array([])
    });
  }

  get organizationalAssignments() {
    return this.userForm.get('organizational_assignments') as FormArray;
  }

  getAssignmentFormGroup(index: number): FormGroup | null {
    const control = this.organizationalAssignments.at(index);
    return control instanceof FormGroup ? control : null;
  }

  addOrganizationalAssignment() {
    const assignment = this.fb.group({
      organizational_unit_id: ['', Validators.required],
      role_in_unit: ['member', Validators.required],
      is_primary: [false],
      start_date: [''],
      end_date: ['']
    });
    this.organizationalAssignments.push(assignment);
  }

  removeOrganizationalAssignment(index: number) {
    this.organizationalAssignments.removeAt(index);
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users: User[]) => { 
        this.users = users; 
        this.loading = false; 
      },
      error: (err: any) => { 
        this.error = 'Failed to load users'; 
        this.loading = false; 
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles: any[]) => { this.roles = roles; },
      error: (err: any) => { this.error = 'Failed to load roles'; }
    });
  }

  loadOrganizationalUnits(): void {
    this.userService.getOrganizationalUnits().subscribe({
      next: (units: OrganizationalUnitOption[]) => { 
        this.organizationalUnits = units; 
      },
      error: (err: any) => { this.error = 'Failed to load organizational units'; }
    });
  }

  onUnitTypeChange(): void {
    if (this.selectedUnitType === 'all') {
      this.loadOrganizationalUnits();
    } else {
      this.userService.getOrganizationalUnitsByType(this.selectedUnitType).subscribe({
        next: (units: OrganizationalUnitOption[]) => { 
          this.organizationalUnits = units; 
        },
        error: (err: any) => { this.error = 'Failed to load organizational units'; }
      });
    }
  }

  getUnitsByType(type: string): OrganizationalUnitOption[] {
    return this.organizationalUnits.filter(unit => unit.unit_type === type);
  }

  startEdit(user: User): void {
    this.editingUser = user;
    this.userForm.patchValue({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      role_id: user.role.id,
      is_active: user.is_active,
      is_verified: user.is_verified
    });

    // Clear existing assignments and add current ones
    while (this.organizationalAssignments.length !== 0) {
      this.organizationalAssignments.removeAt(0);
    }

    if (user.organizational_assignments) {
      user.organizational_assignments.forEach(assignment => {
        const assignmentGroup = this.fb.group({
          organizational_unit_id: [assignment.organizational_unit_id, Validators.required],
          role_in_unit: [assignment.role_in_unit, Validators.required],
          is_primary: [assignment.is_primary],
          start_date: [assignment.start_date || ''],
          end_date: [assignment.end_date || '']
        });
        this.organizationalAssignments.push(assignmentGroup);
      });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.userForm.reset();
    this.organizationalAssignments.clear();
    this.showAdvancedOptions = false;
  }

  submit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formValue = this.userForm.value;
    const organizationalAssignments: UserAssignmentCreate[] = [];

    // Process organizational assignments
    formValue.organizational_assignments.forEach((assignment: any) => {
      if (assignment.organizational_unit_id) {
        organizationalAssignments.push({
          organizational_unit_id: assignment.organizational_unit_id,
          role_in_unit: assignment.role_in_unit,
          is_primary: assignment.is_primary,
          start_date: assignment.start_date || undefined,
          end_date: assignment.end_date || undefined
        });
      }
    });

    if (this.editingUser) {
      // Update user
      const updateData: UserUpdateData = {
        email: formValue.email,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        role_id: formValue.role_id,
        is_active: formValue.is_active,
        is_verified: formValue.is_verified,
        organizational_assignments: organizationalAssignments
      };

      if (formValue.password) {
        updateData.password = formValue.password;
      }

      this.userService.updateUser(this.editingUser.id, updateData).subscribe({
        next: (user: User) => {
          this.success = 'User updated successfully';
          this.loadUsers();
          this.cancelEdit();
          this.loading = false;
        },
        error: (err: any) => { 
          this.error = err.message || 'Failed to update user'; 
          this.loading = false; 
        }
      });
    } else {
      // Create user
      if (!formValue.password) {
        this.error = 'Password is required for new users';
        this.loading = false;
        return;
      }

      const createData: UserCreateData = {
        email: formValue.email,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        password: formValue.password,
        role_id: formValue.role_id,
        is_active: formValue.is_active,
        is_verified: formValue.is_verified,
        organizational_assignments: organizationalAssignments
      };

      this.userService.createUser(createData).subscribe({
        next: (user: User) => {
          this.success = 'User created successfully';
          this.loadUsers();
          this.userForm.reset();
          this.organizationalAssignments.clear();
          this.showAdvancedOptions = false;
          this.loading = false;
        },
        error: (err: any) => { 
          this.error = err.message || 'Failed to create user'; 
          this.loading = false; 
        }
      });
    }
  }

  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to delete user "${user.first_name} ${user.last_name}"?`)) {
      return;
    }

    this.loading = true;
    this.userService.deleteUser(user.id).subscribe({
      next: () => { 
        this.success = 'User deleted successfully'; 
        this.loadUsers(); 
        this.loading = false; 
      },
      error: (err: any) => { 
        this.error = err.message || 'Failed to delete user'; 
        this.loading = false; 
      }
    });
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  getUnitTypeLabel(type: string): string {
    const unitType = this.unitTypes.find(t => t.value === type);
    return unitType ? unitType.label : type;
  }

  getRoleInUnitLabel(role: string): string {
    const roleOption = this.roleInUnitOptions.find(r => r.value === role);
    return roleOption ? roleOption.label : role;
  }

  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isAssignmentFieldInvalid(assignmentIndex: number, fieldName: string): boolean {
    const assignment = this.organizationalAssignments.at(assignmentIndex);
    if (assignment instanceof FormGroup) {
      return this.isFieldInvalid(assignment, fieldName);
    }
    return false;
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormArray) {
        control.controls.forEach((group) => {
          if (group instanceof FormGroup) {
            Object.keys(group.controls).forEach(subKey => {
              group.get(subKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }
} 