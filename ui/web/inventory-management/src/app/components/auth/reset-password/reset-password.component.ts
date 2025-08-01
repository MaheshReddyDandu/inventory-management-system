import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.getTokenFromUrl();
  }

  private initForm(): void {
    this.resetPasswordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator()]]
    });
  }

  private getTokenFromUrl(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
      }
    });
  }

  private passwordStrengthValidator(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      if (!password) return null;

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);

      const errors: ValidationErrors = {};

      if (!hasUpperCase) errors['missingUpperCase'] = true;
      if (!hasLowerCase) errors['missingLowerCase'] = true;
      if (!hasNumbers) errors['missingNumbers'] = true;

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.token) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { new_password } = this.resetPasswordForm.value;

      this.authService.resetPassword(this.token, new_password).subscribe({
        next: (response) => {
          this.successMessage = 'Password reset successfully! Redirecting to login...';
          this.isLoading = false;
          
          // Redirect to login after successful password reset
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Password reset failed. Please try again.';
          this.isLoading = false;
        }
      });
    } else if (!this.token) {
      this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.resetPasswordForm.controls).forEach(key => {
      const control = this.resetPasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.resetPasswordForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${controlName.replace('_', ' ').charAt(0).toUpperCase() + controlName.replace('_', ' ').slice(1)} is required`;
    }
    
    if (control?.hasError('minlength')) {
      return `${controlName.replace('_', ' ').charAt(0).toUpperCase() + controlName.replace('_', ' ').slice(1)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }

    if (controlName === 'new_password' && control?.errors) {
      const errors = control.errors;
      if (errors['missingUpperCase']) return 'Password must contain at least one uppercase letter';
      if (errors['missingLowerCase']) return 'Password must contain at least one lowercase letter';
      if (errors['missingNumbers']) return 'Password must contain at least one number';
    }
    
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.valid && (field.dirty || field.touched));
  }

  getPasswordStrength(): { score: number; label: string; color: string } {
    const password = this.resetPasswordForm.get('new_password')?.value;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;

    const strengthMap = [
      { label: '', color: '' },
      { label: 'Very Weak', color: '#ef4444' },
      { label: 'Weak', color: '#f97316' },
      { label: 'Fair', color: '#eab308' },
      { label: 'Good', color: '#22c55e' }
    ];

    return { score, ...strengthMap[score] };
  }

  getPasswordStrengthWidth(): string {
    const strength = this.getPasswordStrength();
    return `${(strength.score / 4) * 100}%`;
  }
} 