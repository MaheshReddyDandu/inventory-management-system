import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService, User } from '../../services/auth.service';
import { OrganizationService, OrganizationalUnit } from '../../services/organization.service';
import { ModernIconComponent } from '../shared/modern-icon.component';

interface DepartmentNode extends OrganizationalUnit {
  children?: DepartmentNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  subDepartments: number;
  assignedUsers: number;
}

@Component({
  selector: 'app-departments-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModernIconComponent],
  templateUrl: './departments-management.component.html',
  styleUrls: ['./departments-management.component.scss']
})
export class DepartmentsManagementComponent implements OnInit, OnDestroy {
  // Data
  departments: DepartmentNode[] = [];
  filteredDepartments: DepartmentNode[] = [];
  allDepartments: DepartmentNode[] = [];
  selectedDepartment: DepartmentNode | null = null;
  
  // UI State
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  bulkMode = false;
  selectedDepartments: Set<number> = new Set();
  
  // Search and Filters
  searchTerm = '';
  selectedStatus = '';
  selectedParent = '';
  
  // Stats
  stats: DepartmentStats = {
    totalDepartments: 0,
    activeDepartments: 0,
    subDepartments: 0,
    assignedUsers: 0
  };
  
  // Forms
  departmentForm: FormGroup;
  
  // Observables
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];
  
  // Parent department options
  parentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Departments' },
    { value: 'root', label: 'Root Departments Only' },
    { value: 'sub', label: 'Sub Departments Only' }
  ];

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.departmentForm = this.createForm();
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

  private createForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      code: ['', [Validators.required, Validators.pattern(/^DEPT\d{3,}$/)]],
      description: ['', [Validators.maxLength(1000)]],
      address: ['', [Validators.maxLength(500)]],
      contact_person: ['', [Validators.maxLength(255)]],
      contact_email: ['', [Validators.email, Validators.maxLength(255)]],
      contact_phone: ['', [Validators.pattern(/^[\d\s\-\+\(\)]+$/), Validators.maxLength(50)]],
      parent_id: [null],
      is_active: [true],
      sort_order: [0, [Validators.min(0)]]
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.organizationService.getOrganizationalUnits('department').pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading departments:', error);
        this.showError('Failed to load departments');
        return [];
      })
    ).subscribe(departments => {
      this.allDepartments = departments as DepartmentNode[];
      this.buildHierarchy();
      this.applyFilters();
      this.calculateStats();
      this.isLoading = false;
    });
  }

  buildHierarchy(): void {
    const departmentMap = new Map<number, DepartmentNode>();
    const rootDepartments: DepartmentNode[] = [];

    // Create map of all departments
    this.allDepartments.forEach(department => {
      departmentMap.set(department.id, { ...department, children: [], expanded: false, selected: false });
    });

    // Build hierarchy
    this.allDepartments.forEach(department => {
      const node = departmentMap.get(department.id)!;
      if (department.parent_id && departmentMap.has(department.parent_id)) {
        const parent = departmentMap.get(department.parent_id)!;
        parent.children!.push(node);
      } else {
        rootDepartments.push(node);
      }
    });

    this.departments = rootDepartments;
  }

  applyFilters(): void {
    let filtered = [...this.departments];

    // Status filter
    if (this.selectedStatus) {
      filtered = this.filterByStatus(filtered, this.selectedStatus);
    }

    // Parent filter
    if (this.selectedParent) {
      filtered = this.filterByParent(filtered, this.selectedParent);
    }

    // Search filter
    if (this.searchTerm) {
      filtered = this.filterBySearch(filtered, this.searchTerm);
    }

    this.filteredDepartments = filtered;
  }

  private filterByStatus(departments: DepartmentNode[], status: string): DepartmentNode[] {
    return departments.filter(department => {
      const matches = status === 'active' ? department.is_active : !department.is_active;
      const childrenMatch = department.children ? this.filterByStatus(department.children, status) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  private filterByParent(departments: DepartmentNode[], parentType: string): DepartmentNode[] {
    if (parentType === 'root') {
      return departments.filter(department => !department.parent_id);
    } else if (parentType === 'sub') {
      return departments.filter(department => department.parent_id || (department.children && department.children.length > 0));
    }
    return departments;
  }

  private filterBySearch(departments: DepartmentNode[], term: string): DepartmentNode[] {
    const searchTerm = term.toLowerCase();
    return departments.filter(department => {
      const matches = 
        department.name.toLowerCase().includes(searchTerm) ||
        department.code.toLowerCase().includes(searchTerm) ||
        (department.description && department.description.toLowerCase().includes(searchTerm)) ||
        (department.contact_person && department.contact_person.toLowerCase().includes(searchTerm));
      
      const childrenMatch = department.children ? this.filterBySearch(department.children, term) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  calculateStats(): void {
    const allDepartments = this.getAllDepartments(this.departments);
    this.stats = {
      totalDepartments: allDepartments.length,
      activeDepartments: allDepartments.filter(d => d.is_active).length,
      subDepartments: allDepartments.filter(d => d.parent_id).length,
      assignedUsers: allDepartments.reduce((sum, d) => sum + (d.users_count || 0), 0)
    };
  }

  private getAllDepartments(departments: DepartmentNode[]): DepartmentNode[] {
    let all: DepartmentNode[] = [];
    departments.forEach(department => {
      all.push(department);
      if (department.children && department.children.length > 0) {
        all = all.concat(this.getAllDepartments(department.children));
      }
    });
    return all;
  }

  onSearchChange(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedParent = '';
    this.applyFilters();
  }

  openCreateModal(): void {
    this.departmentForm.reset({
      is_active: true,
      sort_order: 0
    });
    this.showCreateModal = true;
  }

  openEditModal(department: DepartmentNode): void {
    this.selectedDepartment = department;
    this.departmentForm.patchValue({
      name: department.name,
      code: department.code,
      description: department.description || '',
      address: department.address || '',
      contact_person: department.contact_person || '',
      contact_email: department.contact_email || '',
      contact_phone: department.contact_phone || '',
      parent_id: department.parent_id || null,
      is_active: department.is_active,
      sort_order: department.sort_order
    });
    this.showEditModal = true;
  }

  openDeleteModal(department: DepartmentNode): void {
    this.selectedDepartment = department;
    this.showDeleteModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedDepartment = null;
    this.departmentForm.reset();
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.departmentForm.value;
    
    const departmentData = {
      ...formData,
      unit_type: 'department',
      product_id: this.authService.getCurrentUserValue()?.product_id || ''
    };

    const operation = this.showEditModal ? 
      this.organizationService.updateOrganizationalUnit(this.selectedDepartment!.id, departmentData) :
      this.organizationService.createOrganizationalUnit(departmentData);

    operation.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error saving department:', error);
        this.showError(`Failed to ${this.showEditModal ? 'update' : 'create'} department`);
        return [];
      })
    ).subscribe(() => {
      this.showSuccess(`Department ${this.showEditModal ? 'updated' : 'created'} successfully`);
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  deleteDepartment(): void {
    if (!this.selectedDepartment) return;

    this.isSubmitting = true;
    this.organizationService.deleteOrganizationalUnit(this.selectedDepartment.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error deleting department:', error);
        this.showError('Failed to delete department');
        return [];
      })
    ).subscribe(() => {
      this.showSuccess('Department deleted successfully');
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  toggleDepartmentExpansion(department: DepartmentNode): void {
    department.expanded = !department.expanded;
  }

  toggleBulkMode(): void {
    this.bulkMode = !this.bulkMode;
    if (!this.bulkMode) {
      this.selectedDepartments.clear();
    }
  }

  toggleDepartmentSelection(department: DepartmentNode): void {
    if (this.selectedDepartments.has(department.id)) {
      this.selectedDepartments.delete(department.id);
    } else {
      this.selectedDepartments.add(department.id);
    }
  }

  selectAllDepartments(): void {
    const allDepartments = this.getAllDepartments(this.filteredDepartments);
    allDepartments.forEach(department => this.selectedDepartments.add(department.id));
  }

  deselectAllDepartments(): void {
    this.selectedDepartments.clear();
  }

  bulkDeleteDepartments(): void {
    if (this.selectedDepartments.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedDepartments.size} department(s)?`)) {
      this.isSubmitting = true;
      const deletePromises = Array.from(this.selectedDepartments).map(id =>
        this.organizationService.deleteOrganizationalUnit(id).toPromise()
      );

      Promise.all(deletePromises).then(() => {
        this.showSuccess(`${this.selectedDepartments.size} department(s) deleted successfully`);
        this.selectedDepartments.clear();
        this.bulkMode = false;
        this.loadData();
        this.isSubmitting = false;
      }).catch(error => {
        console.error('Error bulk deleting departments:', error);
        this.showError('Failed to delete some departments');
        this.isSubmitting = false;
      });
    }
  }

  getParentDepartments(): DepartmentNode[] {
    return this.allDepartments.filter(department => department.unit_type === 'department');
  }

  getDepartmentLevel(department: DepartmentNode): number {
    return department.level || 1;
  }

  getDepartmentStatusClass(department: DepartmentNode): string {
    return department.is_active ? 'status-active' : 'status-inactive';
  }

  getDepartmentStatusText(department: DepartmentNode): string {
    return department.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Department Name',
      code: 'Department Code',
      description: 'Description',
      address: 'Address',
      contact_person: 'Contact Person',
      contact_email: 'Contact Email',
      contact_phone: 'Contact Phone',
      parent_id: 'Parent Department',
      is_active: 'Status',
      sort_order: 'Sort Order'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.departmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.departmentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['pattern']) {
        if (fieldName === 'code') return 'Department code must be in format DEPT001, DEPT002, etc.';
        if (fieldName === 'contact_phone') return 'Please enter a valid phone number';
      }
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.departmentForm.controls).forEach(key => {
      const control = this.departmentForm.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    // Implement success notification
    console.log('Success:', message);
  }

  private showError(message: string): void {
    // Implement error notification
    console.error('Error:', message);
  }

  // Utility methods for template
  trackByDepartment(index: number, department: DepartmentNode): number {
    return department.id;
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isManagerOrAdmin();
  }

  getStatusLabel(statusValue: string): string {
    const option = this.statusOptions.find(s => s.value === statusValue);
    return option ? option.label : statusValue;
  }

  getParentLabel(parentType: string): string {
    const option = this.parentOptions.find(p => p.value === parentType);
    return option ? option.label : parentType;
  }
} 