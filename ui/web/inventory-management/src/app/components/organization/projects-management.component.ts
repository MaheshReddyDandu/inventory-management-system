import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService, User } from '../../services/auth.service';
import { OrganizationService, OrganizationalUnit } from '../../services/organization.service';
import { ModernIconComponent } from '../shared/modern-icon.component';

interface ProjectNode extends OrganizationalUnit {
  children?: ProjectNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  subProjects: number;
  assignedUsers: number;
}

@Component({
  selector: 'app-projects-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModernIconComponent],
  templateUrl: './projects-management.component.html',
  styleUrls: ['./projects-management.component.scss']
})
export class ProjectsManagementComponent implements OnInit, OnDestroy {
  // Data
  projects: ProjectNode[] = [];
  filteredProjects: ProjectNode[] = [];
  allProjects: ProjectNode[] = [];
  selectedProject: ProjectNode | null = null;
  
  // UI State
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  bulkMode = false;
  selectedProjects: Set<number> = new Set();
  
  // Search and Filters
  searchTerm = '';
  selectedStatus = '';
  selectedParent = '';
  
  // Stats
  stats: ProjectStats = {
    totalProjects: 0,
    activeProjects: 0,
    subProjects: 0,
    assignedUsers: 0
  };
  
  // Forms
  projectForm: FormGroup;
  
  // Observables
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];
  
  // Parent project options
  parentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Projects' },
    { value: 'root', label: 'Root Projects Only' },
    { value: 'sub', label: 'Sub Projects Only' }
  ];

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.projectForm = this.createForm();
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
      code: ['', [Validators.required, Validators.pattern(/^PRJ\d{3,}$/)]],
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
    this.loadProjects();
  }

  loadProjects(): void {
    this.organizationService.getOrganizationalUnits('project').pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading projects:', error);
        this.showError('Failed to load projects');
        return [];
      })
    ).subscribe(projects => {
      this.allProjects = projects as ProjectNode[];
      this.buildHierarchy();
      this.applyFilters();
      this.calculateStats();
      this.isLoading = false;
    });
  }

  buildHierarchy(): void {
    const projectMap = new Map<number, ProjectNode>();
    const rootProjects: ProjectNode[] = [];

    // Create map of all projects
    this.allProjects.forEach(project => {
      projectMap.set(project.id, { ...project, children: [], expanded: false, selected: false });
    });

    // Build hierarchy
    this.allProjects.forEach(project => {
      const node = projectMap.get(project.id)!;
      if (project.parent_id && projectMap.has(project.parent_id)) {
        const parent = projectMap.get(project.parent_id)!;
        parent.children!.push(node);
      } else {
        rootProjects.push(node);
      }
    });

    this.projects = rootProjects;
  }

  applyFilters(): void {
    let filtered = [...this.projects];

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

    this.filteredProjects = filtered;
  }

  private filterByStatus(projects: ProjectNode[], status: string): ProjectNode[] {
    return projects.filter(project => {
      const matches = status === 'active' ? project.is_active : !project.is_active;
      const childrenMatch = project.children ? this.filterByStatus(project.children, status) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  private filterByParent(projects: ProjectNode[], parentType: string): ProjectNode[] {
    if (parentType === 'root') {
      return projects.filter(project => !project.parent_id);
    } else if (parentType === 'sub') {
      return projects.filter(project => project.parent_id || (project.children && project.children.length > 0));
    }
    return projects;
  }

  private filterBySearch(projects: ProjectNode[], term: string): ProjectNode[] {
    const searchTerm = term.toLowerCase();
    return projects.filter(project => {
      const matches = 
        project.name.toLowerCase().includes(searchTerm) ||
        project.code.toLowerCase().includes(searchTerm) ||
        (project.description && project.description.toLowerCase().includes(searchTerm)) ||
        (project.contact_person && project.contact_person.toLowerCase().includes(searchTerm));
      
      const childrenMatch = project.children ? this.filterBySearch(project.children, term) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  calculateStats(): void {
    const allProjects = this.getAllProjects(this.projects);
    this.stats = {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.is_active).length,
      subProjects: allProjects.filter(p => p.parent_id).length,
      assignedUsers: allProjects.reduce((sum, p) => sum + (p.users_count || 0), 0)
    };
  }

  private getAllProjects(projects: ProjectNode[]): ProjectNode[] {
    let all: ProjectNode[] = [];
    projects.forEach(project => {
      all.push(project);
      if (project.children && project.children.length > 0) {
        all = all.concat(this.getAllProjects(project.children));
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
    this.projectForm.reset({
      is_active: true,
      sort_order: 0
    });
    this.showCreateModal = true;
  }

  openEditModal(project: ProjectNode): void {
    this.selectedProject = project;
    this.projectForm.patchValue({
      name: project.name,
      code: project.code,
      description: project.description || '',
      address: project.address || '',
      contact_person: project.contact_person || '',
      contact_email: project.contact_email || '',
      contact_phone: project.contact_phone || '',
      parent_id: project.parent_id || null,
      is_active: project.is_active,
      sort_order: project.sort_order
    });
    this.showEditModal = true;
  }

  openDeleteModal(project: ProjectNode): void {
    this.selectedProject = project;
    this.showDeleteModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedProject = null;
    this.projectForm.reset();
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.projectForm.value;
    
    const projectData = {
      ...formData,
      unit_type: 'project',
      product_id: this.authService.getCurrentUserValue()?.product_id || ''
    };

    const operation = this.showEditModal ? 
      this.organizationService.updateOrganizationalUnit(this.selectedProject!.id, projectData) :
      this.organizationService.createOrganizationalUnit(projectData);

    operation.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error saving project:', error);
        this.showError(`Failed to ${this.showEditModal ? 'update' : 'create'} project`);
        return [];
      })
    ).subscribe(() => {
      this.showSuccess(`Project ${this.showEditModal ? 'updated' : 'created'} successfully`);
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  deleteProject(): void {
    if (!this.selectedProject) return;

    this.isSubmitting = true;
    this.organizationService.deleteOrganizationalUnit(this.selectedProject.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error deleting project:', error);
        this.showError('Failed to delete project');
        return [];
      })
    ).subscribe(() => {
      this.showSuccess('Project deleted successfully');
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  toggleProjectExpansion(project: ProjectNode): void {
    project.expanded = !project.expanded;
  }

  toggleBulkMode(): void {
    this.bulkMode = !this.bulkMode;
    if (!this.bulkMode) {
      this.selectedProjects.clear();
    }
  }

  toggleProjectSelection(project: ProjectNode): void {
    if (this.selectedProjects.has(project.id)) {
      this.selectedProjects.delete(project.id);
    } else {
      this.selectedProjects.add(project.id);
    }
  }

  selectAllProjects(): void {
    const allProjects = this.getAllProjects(this.filteredProjects);
    allProjects.forEach(project => this.selectedProjects.add(project.id));
  }

  deselectAllProjects(): void {
    this.selectedProjects.clear();
  }

  bulkDeleteProjects(): void {
    if (this.selectedProjects.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedProjects.size} project(s)?`)) {
      this.isSubmitting = true;
      const deletePromises = Array.from(this.selectedProjects).map(id =>
        this.organizationService.deleteOrganizationalUnit(id).toPromise()
      );

      Promise.all(deletePromises).then(() => {
        this.showSuccess(`${this.selectedProjects.size} project(s) deleted successfully`);
        this.selectedProjects.clear();
        this.bulkMode = false;
        this.loadData();
        this.isSubmitting = false;
      }).catch(error => {
        console.error('Error bulk deleting projects:', error);
        this.showError('Failed to delete some projects');
        this.isSubmitting = false;
      });
    }
  }

  getParentProjects(): ProjectNode[] {
    return this.allProjects.filter(project => project.unit_type === 'project');
  }

  getProjectLevel(project: ProjectNode): number {
    return project.level || 1;
  }

  getProjectStatusClass(project: ProjectNode): string {
    return project.is_active ? 'status-active' : 'status-inactive';
  }

  getProjectStatusText(project: ProjectNode): string {
    return project.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Project Name',
      code: 'Project Code',
      description: 'Description',
      address: 'Address',
      contact_person: 'Contact Person',
      contact_email: 'Contact Email',
      contact_phone: 'Contact Phone',
      parent_id: 'Parent Project',
      is_active: 'Status',
      sort_order: 'Sort Order'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.projectForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['pattern']) {
        if (fieldName === 'code') return 'Project code must be in format PRJ001, PRJ002, etc.';
        if (fieldName === 'contact_phone') return 'Please enter a valid phone number';
      }
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.projectForm.controls).forEach(key => {
      const control = this.projectForm.get(key);
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
  trackByProject(index: number, project: ProjectNode): number {
    return project.id;
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