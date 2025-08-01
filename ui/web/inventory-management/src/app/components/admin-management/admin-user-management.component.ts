import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService, User } from '../../services/user.service';

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
  userForm!: FormGroup;
  editingUser: User | null = null;
  loading = false;
  error = '';
  success = '';

  constructor(private userService: UserService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.initForm();
  }

  private initForm() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      password: ['', [Validators.minLength(8)]],
      role_id: ['', Validators.required],
      is_active: [true],
      is_verified: [false]
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users: User[]) => { this.users = users; this.loading = false; },
      error: (err: any) => { this.error = 'Failed to load users'; this.loading = false; }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles: any[]) => { this.roles = roles; },
      error: (err: any) => { this.error = 'Failed to load roles'; }
    });
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
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.userForm.reset();
  }

  submit(): void {
    if (this.userForm.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    let data = { ...this.userForm.value };
    if (this.editingUser) {
      // If password is empty, remove it from the update payload
      if (!data.password) {
        delete data.password;
      }
      this.userService.updateUser(this.editingUser.id, data).subscribe({
        next: (user: User) => {
          this.success = 'User updated';
          this.loadUsers();
          this.cancelEdit();
          this.loading = false;
        },
        error: (err: any) => { this.error = 'Failed to update user'; this.loading = false; }
      });
    } else {
      // For create, password is required
      if (!data.password) {
        this.error = 'Password is required';
        this.loading = false;
        return;
      }
      this.userService.createUser(data).subscribe({
        next: (user: User) => {
          this.success = 'User created';
          this.loadUsers();
          this.userForm.reset();
          this.loading = false;
        },
        error: (err: any) => { this.error = 'Failed to create user'; this.loading = false; }
      });
    }
  }

  deleteUser(user: User): void {
    if (!confirm('Delete this user?')) return;
    this.loading = true;
    this.userService.deleteUser(user.id).subscribe({
      next: () => { this.success = 'User deleted'; this.loadUsers(); this.loading = false; },
      error: (err: any) => { this.error = 'Failed to delete user'; this.loading = false; }
    });
  }
} 