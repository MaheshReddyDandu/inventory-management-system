import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { 
  OrganizationService, 
  AttendanceReport,
  OrganizationalUnit
} from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-attendance-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './attendance-reports.component.html',
  styleUrls: ['./attendance-reports.component.scss']
})
export class AttendanceReportsComponent implements OnInit {
  reports: AttendanceReport[] = [];
  organizationalUnits: OrganizationalUnit[] = [];
  
  filterForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  
  selectedPeriod = 'week';
  selectedUnitId = '';
  selectedStatus = '';

  constructor(
    private organizationService: OrganizationService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  createFilterForm(): FormGroup {
    return this.fb.group({
      start_date: [this.getDefaultStartDate()],
      end_date: [this.getDefaultEndDate()],
      organizational_unit_id: [''],
      status: [''],
      work_type: ['']
    });
  }

  getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last week
    return date.toISOString().split('T')[0];
  }

  getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadData(): void {
    this.loadOrganizationalUnits();
    this.loadReports();
  }

  loadOrganizationalUnits(): void {
    this.organizationService.getOrganizationalUnits().subscribe({
      next: (units) => {
        this.organizationalUnits = units;
      },
      error: (error) => {
        console.error('Failed to load organizational units:', error);
      }
    });
  }

  loadReports(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;

    this.organizationService.getAttendanceReports(filters).subscribe({
      next: (reports: AttendanceReport[]) => {
        this.reports = reports;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = error.message;
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.loadReports();
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    this.filterForm.patchValue({
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0]
    });

    this.loadReports();
  }

  exportToCSV(): void {
    if (this.reports.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Date',
      'User ID', 
      'User Name',
      'Unit',
      'Check In',
      'Check Out',
      'Status',
      'Work Type',
      'Total Hours',
      'Notes'
    ];

    const csvData = this.reports.map(report => [
      this.formatDate(report.date),
      report.user_id,
      report.user_name || '',
      this.getUnitName(report.organizational_unit_id),
      report.check_in_time ? this.formatTime(report.check_in_time) : '',
      report.check_out_time ? this.formatTime(report.check_out_time) : '',
      report.status,
      report.work_type,
      report.total_hours ? report.total_hours.toFixed(2) : '0',
      report.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getUnitName(unitId: number | undefined): string {
    if (!unitId) return 'No unit assigned';
    const unit = this.organizationalUnits.find(u => u.id === unitId);
    return unit ? unit.name : `Unit ${unitId}`;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'present': 'status-present',
      'late': 'status-late',
      'absent': 'status-absent',
      'early_departure': 'status-warning',
      'overtime': 'status-info'
    };
    return statusClasses[status] || 'status-neutral';
  }

  getStatusIcon(status: string): string {
    const statusIcons: { [key: string]: string } = {
      'present': 'icon-check',
      'late': 'icon-clock',
      'absent': 'icon-x',
      'early_departure': 'icon-arrow-left',
      'overtime': 'icon-plus'
    };
    return statusIcons[status] || 'icon-circle';
  }

  getWorkTypeIcon(workType: string): string {
    const workTypeIcons: { [key: string]: string } = {
      'office': 'icon-building',
      'remote': 'icon-home',
      'hybrid': 'icon-refresh'
    };
    return workTypeIcons[workType] || 'icon-work';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(hours: number): string {
    if (!hours) return '--';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  calculateSummaryStats() {
    if (this.reports.length === 0) {
      return {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalHours: 0,
        averageHours: 0
      };
    }

    const totalDays = this.reports.length;
    const presentDays = this.reports.filter(r => r.status === 'present' || r.status === 'late').length;
    const lateDays = this.reports.filter(r => r.status === 'late').length;
    const absentDays = this.reports.filter(r => r.status === 'absent').length;
    const totalHours = this.reports.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const averageHours = totalHours / Math.max(presentDays, 1);

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours,
      averageHours
    };
  }

  get summaryStats() {
    return this.calculateSummaryStats();
  }

  get isManagerOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isManager();
  }

  trackByReport(index: number, report: AttendanceReport): string {
    return `${report.user_id}-${report.date}`;
  }
}