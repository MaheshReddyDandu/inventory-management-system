import { Component, OnInit, Pipe, PipeTransform, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService, Role } from '../../services/role.service';

// Pipe to convert JSON string to array for table display
@Pipe({ name: 'jsonToArray', standalone: true })
export class JsonToArrayPipe implements PipeTransform {
  transform(value: string): string[] {
    try {
      return JSON.parse(value || '[]');
    } catch {
      return [];
    }
  }
}

@Component({
  selector: 'app-admin-role-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonToArrayPipe],
  templateUrl: './admin-role-management.component.html',
  styleUrls: ['./admin-role-management.component.scss']
})
export class AdminRoleManagementComponent implements OnInit {
  roles: Role[] = [];
  roleForm!: FormGroup;
  editingRole: Role | null = null;
  loading = false;
  error = '';
  success = '';
  showPerms = false;
  // Default permissions list
  allPermissions = [
    'read',
    'write',
    'delete',
    'admin',
    'export',
    'manage-users'
  ];

  constructor(private roleService: RoleService, private fb: FormBuilder, private eRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (this.showPerms && !this.eRef.nativeElement.contains(event.target)) {
      this.showPerms = false;
    }
  }

  ngOnInit(): void {
    this.loadRoles();
    this.initForm();
  }

  private initForm() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      permissions: [[], Validators.required], // array for multi-select
      is_active: [true]
    });
  }

  loadRoles() {
    this.loading = true;
    this.roleService.getRoles().subscribe({
      next: roles => { this.roles = roles; this.loading = false; },
      error: err => { this.error = err.message || 'Failed to load roles'; this.loading = false; }
    });
  }

  startEdit(role: Role) {
    this.editingRole = role;
    let perms: string[] = [];
    try {
      perms = JSON.parse(role.permissions || '[]');
    } catch {
      perms = [];
    }
    this.roleForm.patchValue({
      name: role.name,
      description: role.description,
      permissions: perms,
      is_active: role.is_active !== false
    });
  }

  cancelEdit() {
    this.editingRole = null;
    this.roleForm.reset();
  }

  submit() {
    if (this.roleForm.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    const data = {
      ...this.roleForm.value,
      permissions: JSON.stringify(this.roleForm.value.permissions)
    };
    if (this.editingRole) {
      this.roleService.updateRole(this.editingRole.id, data).subscribe({
        next: role => {
          this.success = 'Role updated';
          this.loadRoles();
          this.cancelEdit();
          this.loading = false;
        },
        error: err => { this.error = err.message || 'Failed to update role'; this.loading = false; }
      });
    } else {
      this.roleService.createRole(data).subscribe({
        next: role => {
          this.success = 'Role created';
          this.loadRoles();
          this.roleForm.reset();
          this.loading = false;
        },
        error: err => { this.error = err.message || 'Failed to create role'; this.loading = false; }
      });
    }
    this.showPerms = false; // Always close dropdown after submit
  }

  deleteRole(role: Role) {
    if (!confirm('Delete this role?')) return;
    this.loading = true;
    this.roleService.deleteRole(role.id).subscribe({
      next: () => { this.success = 'Role deleted'; this.loadRoles(); this.loading = false; },
      error: err => { this.error = err.message || 'Failed to delete role'; this.loading = false; }
    });
  }

  onPermissionToggle(perm: string, event: any) {
    const perms = this.roleForm.value.permissions as string[];
    if (event.target.checked) {
      if (!perms.includes(perm)) {
        this.roleForm.patchValue({ permissions: [...perms, perm] });
      }
    } else {
      this.roleForm.patchValue({ permissions: perms.filter(p => p !== perm) });
    }
    this.showPerms = false; // Close dropdown after any selection
  }
} 