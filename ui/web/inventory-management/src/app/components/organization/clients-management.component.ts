import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService, User } from '../../services/auth.service';
import { OrganizationService, OrganizationalUnit } from '../../services/organization.service';
import { ModernIconComponent } from '../shared/modern-icon.component';

interface ClientNode extends OrganizationalUnit {
  children?: ClientNode[];
  expanded?: boolean;
  selected?: boolean;
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  subClients: number;
  assignedUsers: number;
}

@Component({
  selector: 'app-clients-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ModernIconComponent],
  templateUrl: './clients-management.component.html',
  styleUrls: ['./clients-management.component.scss']
})
export class ClientsManagementComponent implements OnInit, OnDestroy {
  // Data
  clients: ClientNode[] = [];
  filteredClients: ClientNode[] = [];
  allClients: ClientNode[] = [];
  selectedClient: ClientNode | null = null;
  
  // UI State
  isLoading = false;
  isSubmitting = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  bulkMode = false;
  selectedClients: Set<number> = new Set();
  
  // Search and Filters
  searchTerm = '';
  selectedStatus = '';
  selectedParent = '';
  
  // Stats
  stats: ClientStats = {
    totalClients: 0,
    activeClients: 0,
    subClients: 0,
    assignedUsers: 0
  };
  
  // Forms
  clientForm: FormGroup;
  
  // Observables
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];
  
  // Parent client options
  parentOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Clients' },
    { value: 'root', label: 'Root Clients Only' },
    { value: 'sub', label: 'Sub Clients Only' }
  ];

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.clientForm = this.createForm();
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
      code: ['', [Validators.required, Validators.pattern(/^CL\d{3,}$/)]],
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
    this.loadClients();
  }

  loadClients(): void {
    this.organizationService.getOrganizationalUnits('client').pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading clients:', error);
        this.showError('Failed to load clients');
        return [];
      })
    ).subscribe(clients => {
      this.allClients = clients as ClientNode[];
      this.buildHierarchy();
      this.applyFilters();
      this.calculateStats();
      this.isLoading = false;
    });
  }

  buildHierarchy(): void {
    const clientMap = new Map<number, ClientNode>();
    const rootClients: ClientNode[] = [];

    // Create map of all clients
    this.allClients.forEach(client => {
      clientMap.set(client.id, { ...client, children: [], expanded: false, selected: false });
    });

    // Build hierarchy
    this.allClients.forEach(client => {
      const node = clientMap.get(client.id)!;
      if (client.parent_id && clientMap.has(client.parent_id)) {
        const parent = clientMap.get(client.parent_id)!;
        parent.children!.push(node);
      } else {
        rootClients.push(node);
      }
    });

    this.clients = rootClients;
  }

  applyFilters(): void {
    let filtered = [...this.clients];

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

    this.filteredClients = filtered;
  }

  private filterByStatus(clients: ClientNode[], status: string): ClientNode[] {
    return clients.filter(client => {
      const matches = status === 'active' ? client.is_active : !client.is_active;
      const childrenMatch = client.children ? this.filterByStatus(client.children, status) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  private filterByParent(clients: ClientNode[], parentType: string): ClientNode[] {
    if (parentType === 'root') {
      return clients.filter(client => !client.parent_id);
    } else if (parentType === 'sub') {
      return clients.filter(client => client.parent_id || (client.children && client.children.length > 0));
    }
    return clients;
  }

  private filterBySearch(clients: ClientNode[], term: string): ClientNode[] {
    const searchTerm = term.toLowerCase();
    return clients.filter(client => {
      const matches = 
        client.name.toLowerCase().includes(searchTerm) ||
        client.code.toLowerCase().includes(searchTerm) ||
        (client.description && client.description.toLowerCase().includes(searchTerm)) ||
        (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm));
      
      const childrenMatch = client.children ? this.filterBySearch(client.children, term) : [];
      return matches || childrenMatch.length > 0;
    });
  }

  calculateStats(): void {
    const allClients = this.getAllClients(this.clients);
    this.stats = {
      totalClients: allClients.length,
      activeClients: allClients.filter(c => c.is_active).length,
      subClients: allClients.filter(c => c.parent_id).length,
      assignedUsers: allClients.reduce((sum, c) => sum + (c.users_count || 0), 0)
    };
  }

  private getAllClients(clients: ClientNode[]): ClientNode[] {
    let all: ClientNode[] = [];
    clients.forEach(client => {
      all.push(client);
      if (client.children && client.children.length > 0) {
        all = all.concat(this.getAllClients(client.children));
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
    this.clientForm.reset({
      is_active: true,
      sort_order: 0
    });
    this.showCreateModal = true;
  }

  openEditModal(client: ClientNode): void {
    this.selectedClient = client;
    this.clientForm.patchValue({
      name: client.name,
      code: client.code,
      description: client.description || '',
      address: client.address || '',
      contact_person: client.contact_person || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      parent_id: client.parent_id || null,
      is_active: client.is_active,
      sort_order: client.sort_order
    });
    this.showEditModal = true;
  }

  openDeleteModal(client: ClientNode): void {
    this.selectedClient = client;
    this.showDeleteModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedClient = null;
    this.clientForm.reset();
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.clientForm.value;
    
    const clientData = {
      ...formData,
      unit_type: 'client',
      product_id: this.authService.getCurrentUserValue()?.product_id || ''
    };

    const operation = this.showEditModal ? 
      this.organizationService.updateOrganizationalUnit(this.selectedClient!.id, clientData) :
      this.organizationService.createOrganizationalUnit(clientData);

    operation.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error saving client:', error);
        this.showError(`Failed to ${this.showEditModal ? 'update' : 'create'} client`);
        return [];
      })
    ).subscribe(() => {
      this.showSuccess(`Client ${this.showEditModal ? 'updated' : 'created'} successfully`);
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  deleteClient(): void {
    if (!this.selectedClient) return;

    this.isSubmitting = true;
    this.organizationService.deleteOrganizationalUnit(this.selectedClient.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error deleting client:', error);
        this.showError('Failed to delete client');
        return [];
      })
    ).subscribe(() => {
      this.showSuccess('Client deleted successfully');
      this.closeModal();
      this.loadData();
      this.isSubmitting = false;
    });
  }

  toggleClientExpansion(client: ClientNode): void {
    client.expanded = !client.expanded;
  }

  toggleBulkMode(): void {
    this.bulkMode = !this.bulkMode;
    if (!this.bulkMode) {
      this.selectedClients.clear();
    }
  }

  toggleClientSelection(client: ClientNode): void {
    if (this.selectedClients.has(client.id)) {
      this.selectedClients.delete(client.id);
    } else {
      this.selectedClients.add(client.id);
    }
  }

  selectAllClients(): void {
    const allClients = this.getAllClients(this.filteredClients);
    allClients.forEach(client => this.selectedClients.add(client.id));
  }

  deselectAllClients(): void {
    this.selectedClients.clear();
  }

  bulkDeleteClients(): void {
    if (this.selectedClients.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedClients.size} client(s)?`)) {
      this.isSubmitting = true;
      const deletePromises = Array.from(this.selectedClients).map(id =>
        this.organizationService.deleteOrganizationalUnit(id).toPromise()
      );

      Promise.all(deletePromises).then(() => {
        this.showSuccess(`${this.selectedClients.size} client(s) deleted successfully`);
        this.selectedClients.clear();
        this.bulkMode = false;
        this.loadData();
        this.isSubmitting = false;
      }).catch(error => {
        console.error('Error bulk deleting clients:', error);
        this.showError('Failed to delete some clients');
        this.isSubmitting = false;
      });
    }
  }

  getParentClients(): ClientNode[] {
    return this.allClients.filter(client => client.unit_type === 'client');
  }

  getClientLevel(client: ClientNode): number {
    return client.level || 1;
  }

  getClientStatusClass(client: ClientNode): string {
    return client.is_active ? 'status-active' : 'status-inactive';
  }

  getClientStatusText(client: ClientNode): string {
    return client.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Client Name',
      code: 'Client Code',
      description: 'Description',
      address: 'Address',
      contact_person: 'Contact Person',
      contact_email: 'Contact Email',
      contact_phone: 'Contact Phone',
      parent_id: 'Parent Client',
      is_active: 'Status',
      sort_order: 'Sort Order'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (field.errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['pattern']) {
        if (fieldName === 'code') return 'Client code must be in format CL001, CL002, etc.';
        if (fieldName === 'contact_phone') return 'Please enter a valid phone number';
      }
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clientForm.controls).forEach(key => {
      const control = this.clientForm.get(key);
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
  trackByClient(index: number, client: ClientNode): number {
    return client.id;
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