import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService, User } from '../../services/auth.service';
import { OrganizationService, OrganizationalUnit } from '../../services/organization.service';
import { ModernIconComponent } from '../shared/modern-icon.component';

interface BranchNode extends OrganizationalUnit {
  children?: BranchNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  subBranches: number;
  assignedUsers: number;
}

@Component({
  selector: 'app-branches-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModernIconComponent],
  templateUrl: './branches-management.component.html',
  styleUrls: ['./branches-management.component.scss']
})
export class BranchesManagementComponent implements OnInit, OnDestroy {
  // Data
  branches: BranchNode[] = [];
  filteredBranches: BranchNode[] = [];
  allBranches: BranchNode[] = [];
  selectedBranch: BranchNode | null = null;
  
  // UI State
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  bulkMode = false;
  selectedBranches: Set<number> = new Set();
  
  // Search and Filters
  searchTerm = '';
  selectedStatus = '';
  selectedParent = '';
  
  // Stats
  stats: BranchStats = {
    totalBranches: 0,
    activeBranches: 0,
    subBranches: 0,
    assignedUsers: 0
  };
  
  // Forms
  branchForm: FormGroup;
  
  // Observables
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];
  
  // Parent branch options
  parentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Branches' },
    { value: 'root', label: 'Root Branches Only' },
    { value: 'sub', label: 'Sub Branches Only' }
  ];

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.branchForm = this.createForm();
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
      code: ['', [Validators.required, Validators.pattern(/^BR\d{3,}$/)]],
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
    this.loadBranches();
  }

  loadBranches(): void {
    this.organizationService.getOrganizationalUnits('branch').pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading branches:', error);
        this.showError('Failed to load branches');
        return [];
      })
    ).subscribe(branches => {
      this.allBranches = branches as BranchNode[];
      this.buildHierarchy();
      this.applyFilters();
      this.calculateStats();
      this.isLoading = false;
    });
  }

  buildHierarchy(): void {
    const branchMap = new Map<number, BranchNode>();
    const rootBranches: BranchNode[] = [];

    // Create map of all branches
    this.allBranches.forEach(branch => {
      branchMap.set(branch.id, { ...branch, children: [], expanded: false, selected: false });
    });

    // Build hierarchy
    this.allBranches.forEach(branch => {
      const node = branchMap.get(branch.id)!;
      if (branch.parent_id && branchMap.has(branch.parent_id)) {
        const parent = branchMap.get(branch.parent_id)!;
        parent.children!.push(node);
      } else {
        rootBranches.push(node);
      }
    });

    this.branches = rootBranches;
  }

  applyFilters(): void {
    let filtered = [...this.branches];

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

    this.filteredBranches = filtered;
  }

  private filterByStatus(branches: BranchNode[], status: string): BranchNode[] {
    return branches.filter(branch => {
      const matches = status === 'active' ? branch.is_active : !branch.is_active;
      const childrenMatch = branch.children ? this.filterByStatus(branch.children, status) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  private filterByParent(branches: BranchNode[], parentType: string): BranchNode[] {
    if (parentType === 'root') {
      return branches.filter(branch => !branch.parent_id);
    } else if (parentType === 'sub') {
      return branches.filter(branch => branch.parent_id || (branch.children && branch.children.length > 0));
    }
    return branches;
  }

  private filterBySearch(branches: BranchNode[], term: string): BranchNode[] {
    const searchTerm = term.toLowerCase();
    return branches.filter(branch => {
      const matches = 
        branch.name.toLowerCase().includes(searchTerm) ||
        branch.code.toLowerCase().includes(searchTerm) ||
        (branch.description && branch.description.toLowerCase().includes(searchTerm)) ||
        (branch.contact_person && branch.contact_person.toLowerCase().includes(searchTerm));
      
      const childrenMatch = branch.children ? this.filterBySearch(branch.children, term) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  calculateStats(): void {
    const allBranches = this.getAllBranches(this.branches);
    this.stats = {
      totalBranches: allBranches.length,
      activeBranches: allBranches.filter(b => b.is_active).length,
      subBranches: allBranches.filter(b => b.parent_id).length,
      assignedUsers: allBranches.reduce((sum, b) => sum + (b.users_count || 0), 0)
    };
  }

  private getAllBranches(branches: BranchNode[]): BranchNode[] {
    let all: BranchNode[] = [];
    branches.forEach(branch => {
      all.push(branch);
      if (branch.children && branch.children.length > 0) {
        all = all.concat(this.getAllBranches(branch.children));
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
    this.branchForm.reset({
      is_active: true,
      sort_order: 0
    });
    this.showCreateModal = true;
  }

  openEditModal(branch: BranchNode): void {
    this.selectedBranch = branch;
    this.branchForm.patchValue({
      name: branch.name,
      code: branch.code,
      description: branch.description || '',
      address: branch.address || '',
      contact_person: branch.contact_person || '',
      contact_email: branch.contact_email || '',
      contact_phone: branch.contact_phone || '',
      parent_id: branch.parent_id || null,
      is_active: branch.is_active,
      sort_order: branch.sort_order
    });
    this.showEditModal = true;
  }

  openDeleteModal(branch: BranchNode): void {
    this.selectedBranch = branch;
    this.showDeleteModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedBranch = null;
    this.branchForm.reset();
  }

  onSubmit(): void {
    if (this.branchForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.branchForm.value;
    
    const branchData = {
      ...formData,
      unit_type: 'branch',
      product_id: this.authService.getCurrentUserValue()?.product_id || ''
    };

    const operation = this.showEditModal ? 
      this.organizationService.updateOrganizationalUnit(this.selectedBranch!.id, branchData) :
      this.organizationService.createOrganizationalUnit(branchData);

    operation.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error saving branch:', error);
        this.showError(`Failed to ${this.showEditModal ? 'update' : 'create'} branch`);
        return [];
      })
    ).subscribe(() => {
      this.showSuccess(`Branch ${this.showEditModal ? 'updated' : 'created'} successfully`);
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  deleteBranch(): void {
    if (!this.selectedBranch) return;

    this.isSubmitting = true;
    this.organizationService.deleteOrganizationalUnit(this.selectedBranch.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error deleting branch:', error);
        this.showError('Failed to delete branch');
        return [];
      })
    ).subscribe(() => {
      this.showSuccess('Branch deleted successfully');
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  toggleBranchExpansion(branch: BranchNode): void {
    branch.expanded = !branch.expanded;
  }

  toggleBulkMode(): void {
    this.bulkMode = !this.bulkMode;
    if (!this.bulkMode) {
      this.selectedBranches.clear();
    }
  }

  toggleBranchSelection(branch: BranchNode): void {
    if (this.selectedBranches.has(branch.id)) {
      this.selectedBranches.delete(branch.id);
    } else {
      this.selectedBranches.add(branch.id);
    }
  }

  selectAllBranches(): void {
    const allBranches = this.getAllBranches(this.filteredBranches);
    allBranches.forEach(branch => this.selectedBranches.add(branch.id));
  }

  deselectAllBranches(): void {
    this.selectedBranches.clear();
  }

  bulkDeleteBranches(): void {
    if (this.selectedBranches.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedBranches.size} branch(es)?`)) {
      this.isSubmitting = true;
      const deletePromises = Array.from(this.selectedBranches).map(id =>
        this.organizationService.deleteOrganizationalUnit(id).toPromise()
      );

      Promise.all(deletePromises).then(() => {
        this.showSuccess(`${this.selectedBranches.size} branch(es) deleted successfully`);
        this.selectedBranches.clear();
        this.bulkMode = false;
        this.loadData();
        this.isSubmitting = false;
      }).catch(error => {
        console.error('Error bulk deleting branches:', error);
        this.showError('Failed to delete some branches');
        this.isSubmitting = false;
      });
    }
  }

  getParentBranches(): BranchNode[] {
    return this.allBranches.filter(branch => branch.unit_type === 'branch');
  }

  getBranchLevel(branch: BranchNode): number {
    return branch.level || 1;
  }

  getBranchStatusClass(branch: BranchNode): string {
    return branch.is_active ? 'status-active' : 'status-inactive';
  }

  getBranchStatusText(branch: BranchNode): string {
    return branch.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Branch Name',
      code: 'Branch Code',
      description: 'Description',
      address: 'Address',
      contact_person: 'Contact Person',
      contact_email: 'Contact Email',
      contact_phone: 'Contact Phone',
      parent_id: 'Parent Branch',
      is_active: 'Status',
      sort_order: 'Sort Order'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.branchForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.branchForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['pattern']) {
        if (fieldName === 'code') return 'Branch code must be in format BR001, BR002, etc.';
        if (fieldName === 'contact_phone') return 'Please enter a valid phone number';
      }
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.branchForm.controls).forEach(key => {
      const control = this.branchForm.get(key);
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
  trackByBranch(index: number, branch: BranchNode): number {
    return branch.id;
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