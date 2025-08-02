import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { OrganizationService, AttendanceRule } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-attendance-rules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './attendance-rules.component.html',
  styleUrls: ['./attendance-rules.component.scss']
})
export class AttendanceRulesComponent implements OnInit {
  rules: AttendanceRule[] = [];
  filteredRules: AttendanceRule[] = [];
  
  ruleForm: FormGroup;
  editingRule: AttendanceRule | null = null;
  isModalOpen = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  searchTerm = '';

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.ruleForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadRules();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      rule_type: ['work_hours', Validators.required],
      parameters: this.fb.group({
        start_time: ['09:00', Validators.required],
        end_time: ['17:00', Validators.required],
        late_threshold_minutes: [15, [Validators.required, Validators.min(0)]],
        early_departure_threshold_minutes: [15, [Validators.required, Validators.min(0)]],
        break_duration_minutes: [60, [Validators.required, Validators.min(0)]],
        required_work_hours: [8, [Validators.required, Validators.min(1)]],
        weekend_work_allowed: [false],
        remote_work_allowed: [true]
      }),
      is_active: [true]
    });
  }

  loadRules(): void {
    this.isLoading = true;
    this.organizationService.getAttendanceRules().subscribe({
      next: (rules) => {
        this.rules = rules;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.rules];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(rule => 
        rule.name.toLowerCase().includes(term) ||
        rule.description?.toLowerCase().includes(term) ||
        rule.rule_type.toLowerCase().includes(term)
      );
    }
    
    this.filteredRules = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingRule = null;
    this.ruleForm.reset();
    this.ruleForm.patchValue({
      rule_type: 'work_hours',
      is_active: true,
      parameters: {
        start_time: '09:00',
        end_time: '17:00',
        late_threshold_minutes: 15,
        early_departure_threshold_minutes: 15,
        break_duration_minutes: 60,
        required_work_hours: 8,
        weekend_work_allowed: false,
        remote_work_allowed: true
      }
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(rule: AttendanceRule): void {
    this.editingRule = rule;
    this.ruleForm.patchValue({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      parameters: rule.parameters,
      is_active: rule.is_active
    });
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingRule = null;
    this.ruleForm.reset();
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.ruleForm.value;

    const operation = this.editingRule 
      ? this.organizationService.updateAttendanceRule(this.editingRule.id, formData)
      : this.organizationService.createAttendanceRule(formData);

    operation.subscribe({
      next: (rule) => {
        this.successMessage = this.editingRule 
          ? 'Rule updated successfully!' 
          : 'Rule created successfully!';
        
        if (this.editingRule) {
          const index = this.rules.findIndex(r => r.id === this.editingRule!.id);
          if (index >= 0) {
            this.rules[index] = rule;
          }
        } else {
          this.rules.push(rule);
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

  deleteRule(rule: AttendanceRule): void {
    if (!confirm(`Are you sure you want to delete "${rule.name}"? This action cannot be undone.`)) {
      return;
    }

    this.isLoading = true;
    this.organizationService.deleteAttendanceRule(rule.id).subscribe({
      next: () => {
        this.successMessage = 'Rule deleted successfully!';
        this.rules = this.rules.filter(r => r.id !== rule.id);
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

  toggleRuleStatus(rule: AttendanceRule): void {
    const updatedRule = { ...rule, is_active: !rule.is_active };
    
    this.organizationService.updateAttendanceRule(rule.id, updatedRule).subscribe({
      next: (updated) => {
        const index = this.rules.findIndex(r => r.id === rule.id);
        if (index >= 0) {
          this.rules[index] = updated;
        }
        this.applyFilters();
        this.successMessage = `Rule ${updated.is_active ? 'activated' : 'deactivated'} successfully!`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }

  getRuleTypeDisplay(type: string): string {
    const types: { [key: string]: string } = {
      'work_hours': 'Work Hours',
      'break_policy': 'Break Policy',
      'overtime': 'Overtime Rules',
      'location_based': 'Location Based',
      'flexible': 'Flexible Hours'
    };
    return types[type] || type;
  }

  getRuleStatusClass(rule: AttendanceRule): string {
    return rule.is_active ? 'status-active' : 'status-inactive';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.ruleForm.controls).forEach(key => {
      const control = this.ruleForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          control.get(nestedKey)?.markAsTouched();
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.ruleForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.ruleForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  trackByRule(index: number, rule: AttendanceRule): number {
    return rule.id;
  }
}