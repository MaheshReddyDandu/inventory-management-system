import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { 
  OrganizationService, 
  OrganizationalUnit, 
  HierarchyNode 
} from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-organization-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './organization-management.component.html',
  styleUrls: ['./organization-management.component.scss']
})
export class OrganizationManagementComponent implements OnInit {
  units: OrganizationalUnit[] = [];
  hierarchyTree: HierarchyNode[] = [];
  filteredUnits: OrganizationalUnit[] = [];
  
  unitForm: FormGroup;
  editingUnit: OrganizationalUnit | null = null;
  isModalOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  selectedUnitType = '';
  searchTerm = '';
  
  unitTypes = [
    { value: 'branch', label: 'Branch' },
    { value: 'client', label: 'Client' },
    { value: 'department', label: 'Department' },
    { value: 'project', label: 'Project' }
  ];

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.unitForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadUnits();
    this.loadHierarchy();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      unit_type: ['', Validators.required],
      parent_id: [null],
      code: [''],
      description: [''],
      address: [''],
      contact_person: [''],
      contact_email: ['', Validators.email],
      contact_phone: ['']
    });
  }

  loadUnits(): void {
    this.isLoading = true;
    this.organizationService.getOrganizationalUnits(this.selectedUnitType)
      .subscribe({
        next: (units) => {
          this.units = units;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  loadHierarchy(): void {
    this.organizationService.getHierarchyTree()
      .subscribe({
        next: (tree) => {
          this.hierarchyTree = tree;
        },
        error: (error) => {
          console.error('Failed to load hierarchy:', error);
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.units];
    
    if (this.selectedUnitType) {
      filtered = filtered.filter(unit => unit.unit_type === this.selectedUnitType);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(unit => 
        unit.name.toLowerCase().includes(term) ||
        unit.code.toLowerCase().includes(term) ||
        unit.unit_type.toLowerCase().includes(term)
      );
    }
    
    this.filteredUnits = filtered;
  }

  onUnitTypeChange(): void {
    this.loadUnits();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingUnit = null;
    this.unitForm.reset();
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(unit: OrganizationalUnit): void {
    this.editingUnit = unit;
    this.unitForm.patchValue({
      name: unit.name,
      unit_type: unit.unit_type,
      parent_id: unit.parent_id,
      code: unit.code,
      description: unit.description,
      address: unit.address,
      contact_person: unit.contact_person,
      contact_email: unit.contact_email,
      contact_phone: unit.contact_phone
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingUnit = null;
    this.unitForm.reset();
  }

  onSubmit(): void {
    if (this.unitForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.unitForm.value;

    const operation = this.editingUnit 
      ? this.organizationService.updateOrganizationalUnit(this.editingUnit.id, formData)
      : this.organizationService.createOrganizationalUnit(formData);

    operation.subscribe({
      next: (unit) => {
        this.successMessage = this.editingUnit 
          ? 'Unit updated successfully!' 
          : 'Unit created successfully!';
        this.loadUnits();
        this.loadHierarchy();
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

  deleteUnit(unit: OrganizationalUnit): void {
    if (!confirm(`Are you sure you want to delete "${unit.name}"? This action cannot be undone.`)) {
      return;
    }

    this.isLoading = true;
    this.organizationService.deleteOrganizationalUnit(unit.id)
      .subscribe({
        next: () => {
          this.successMessage = 'Unit deleted successfully!';
          this.loadUnits();
          this.loadHierarchy();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message;
          this.isLoading = false;
        }
      });
  }

  getParentUnits(): OrganizationalUnit[] {
    const selectedType = this.unitForm.get('unit_type')?.value;
    if (!selectedType) return [];
    
    // Filter potential parents based on hierarchy logic
    return this.units.filter(unit => 
      unit.unit_type !== selectedType || unit.level < 3
    );
  }

  getUnitTypeLabel(type: string): string {
    const unitType = this.unitTypes.find(t => t.value === type);
    return unitType ? unitType.label : type;
  }

  getUnitStatusClass(unit: OrganizationalUnit): string {
    return unit.is_active ? 'status-active' : 'status-inactive';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.unitForm.controls).forEach(key => {
      const control = this.unitForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.unitForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.unitForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['email']) return 'Please enter a valid email address';
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  trackByUnit(index: number, unit: OrganizationalUnit): number {
    return unit.id;
  }
}