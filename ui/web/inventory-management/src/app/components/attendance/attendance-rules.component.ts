import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { OrganizationService, AttendanceRule, AttendanceRuleCreate, AttendanceRuleUpdate } from '../../services/organization.service';
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
  showCustomWorkDays = false;
  customWorkDays: string[] = ['1', '2', '3', '4', '5']; // Default to weekdays

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
      rule_name: ['', [Validators.required, Validators.minLength(2)]],
      start_time: ['09:00', Validators.required],
      end_time: ['17:00', Validators.required],
      late_threshold_minutes: [15, [Validators.required, Validators.min(0)]],
      half_day_threshold_hours: [4, [Validators.required, Validators.min(1)]],
      work_days: ['1,2,3,4,5', Validators.required],
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
    this.filteredRules = this.rules.filter(rule => {
      if (!this.searchTerm) return true;
      
      const searchLower = this.searchTerm.toLowerCase();
      return rule.rule_name.toLowerCase().includes(searchLower) ||
             rule.work_days.toLowerCase().includes(searchLower);
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingRule = null;
    this.showCustomWorkDays = false;
    this.customWorkDays = ['1', '2', '3', '4', '5'];
    this.ruleForm.reset({
      rule_name: '',
      start_time: '09:00',
      end_time: '17:00',
      late_threshold_minutes: 15,
      half_day_threshold_hours: 4,
      work_days: '1,2,3,4,5',
      is_active: true
    });
    this.isModalOpen = true;
  }

  openEditModal(rule: AttendanceRule): void {
    this.editingRule = rule;
    
    // Parse work days for custom selection
    const workDaysArray = rule.work_days.split(',');
    this.customWorkDays = workDaysArray;
    
    // Determine if it's a custom selection
    const standardOptions = ['1,2,3,4,5', '1,2,3,4,5,6', '1,2,3,4,5,6,7', '1,2,3,4,5,7'];
    const isCustom = !standardOptions.includes(rule.work_days);
    
    if (isCustom) {
      this.showCustomWorkDays = true;
    } else {
      this.showCustomWorkDays = false;
    }
    
    // Transform backend data to frontend form structure
    this.ruleForm.patchValue({
      rule_name: rule.rule_name,
      start_time: rule.start_time,
      end_time: rule.end_time,
      late_threshold_minutes: rule.late_threshold_minutes,
      half_day_threshold_hours: rule.half_day_threshold_hours,
      work_days: isCustom ? 'custom' : rule.work_days,
      is_active: rule.is_active
    });
    
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingRule = null;
    this.showCustomWorkDays = false;
    this.customWorkDays = ['1', '2', '3', '4', '5'];
    this.errorMessage = '';
  }

  onWorkDaysChange(event: any): void {
    const selectedValue = event.target.value;
    
    if (selectedValue === 'custom') {
      this.showCustomWorkDays = true;
      // Don't update the form control yet, wait for custom selection
    } else if (selectedValue === 'alternate_saturdays') {
      this.showCustomWorkDays = false;
      // For alternate Saturdays, we'll use a special format
      this.ruleForm.patchValue({ work_days: 'alternate_saturdays' });
    } else {
      this.showCustomWorkDays = false;
      this.ruleForm.patchValue({ work_days: selectedValue });
    }
  }

  toggleWorkDay(day: string, event: any): void {
    if (event.target.checked) {
      if (!this.customWorkDays.includes(day)) {
        this.customWorkDays.push(day);
      }
    } else {
      this.customWorkDays = this.customWorkDays.filter(d => d !== day);
    }
    
    // Sort the days in order (Monday=1 to Sunday=7)
    this.customWorkDays.sort();
    
    // Update the form control with the custom selection
    this.ruleForm.patchValue({ work_days: this.customWorkDays.join(',') });
  }

  getCustomWorkDaysDisplay(): string {
    if (this.customWorkDays.length === 0) {
      return 'No days selected';
    }
    
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const selectedDayNames = this.customWorkDays.map(day => dayNames[parseInt(day) - 1]);
    
    if (selectedDayNames.length === 1) {
      return selectedDayNames[0];
    } else if (selectedDayNames.length === 2) {
      return `${selectedDayNames[0]} and ${selectedDayNames[1]}`;
    } else {
      const lastDay = selectedDayNames.pop();
      return `${selectedDayNames.join(', ')} and ${lastDay}`;
    }
  }

  getWorkDaysDisplay(workDays: string): string {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (workDays === '1,2,3,4,5') {
      return 'Weekdays Only (Monday - Friday)';
    } else if (workDays === '1,2,3,4,5,6') {
      return 'Weekdays + Saturday';
    } else if (workDays === '1,2,3,4,5,6,7') {
      return 'Every Day (Monday - Sunday)';
    } else if (workDays === '1,2,3,4,5,7') {
      return 'Weekdays + Sunday';
    } else {
      // Custom work days
      const days = workDays.split(',');
      const selectedDayNames = days.map(day => dayNames[parseInt(day) - 1]);
      
      if (selectedDayNames.length === 1) {
        return selectedDayNames[0];
      } else if (selectedDayNames.length === 2) {
        return `${selectedDayNames[0]} and ${selectedDayNames[1]}`;
      } else {
        const lastDay = selectedDayNames.pop();
        return `${selectedDayNames.join(', ')} and ${lastDay}`;
      }
    }
  }

  onSubmit(): void {
    if (this.ruleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const formData = this.ruleForm.value;

    // Handle alternate Saturdays special case
    let workDaysValue = formData.work_days;
    if (formData.work_days === 'alternate_saturdays') {
      // For alternate Saturdays, we'll use a special format that the backend can interpret
      // This could be '1,2,3,4,5,6_alt' or similar, but for now we'll use a simple approach
      workDaysValue = '1,2,3,4,5,6_alt'; // Backend will need to handle this
    } else if (formData.work_days === 'custom') {
      workDaysValue = this.customWorkDays.join(',');
    }

    // Transform form data to match backend API schema
    const transformedData: AttendanceRuleCreate = {
      rule_name: formData.rule_name,
      start_time: formData.start_time,
      end_time: formData.end_time,
      late_threshold_minutes: formData.late_threshold_minutes,
      half_day_threshold_hours: formData.half_day_threshold_hours,
      work_days: workDaysValue,
      organizational_unit_id: undefined,
      is_active: formData.is_active
    };

    const operation = this.editingRule 
      ? this.organizationService.updateAttendanceRule(this.editingRule.id, transformedData as AttendanceRuleUpdate)
      : this.organizationService.createAttendanceRule(transformedData);

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
    if (!confirm(`Are you sure you want to delete "${rule.rule_name}"? This action cannot be undone.`)) {
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
    const updatedRule: AttendanceRuleUpdate = { is_active: !rule.is_active };
    
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
    if (field && field.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  trackByRule(index: number, rule: AttendanceRule): number {
    return rule.id;
  }
}