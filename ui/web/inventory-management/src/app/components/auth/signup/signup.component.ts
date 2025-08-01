import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      last_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator()]],
      agreeToTerms: [false, [Validators.requiredTrue]]
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
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userData = {
        email: this.signupForm.value.email,
        first_name: this.signupForm.value.first_name,
        last_name: this.signupForm.value.last_name,
        password: this.signupForm.value.password
      };

      this.authService.signup(userData).subscribe({
        next: (response) => {
          this.successMessage = 'Account created successfully! You can now login.';
          this.isLoading = false;
          // Redirect to login after successful signup
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Signup failed. Please try again.';
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.signupForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${controlName.replace('_', ' ').charAt(0).toUpperCase() + controlName.replace('_', ' ').slice(1)} is required`;
    }
    
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (control?.hasError('minlength')) {
      return `${controlName.replace('_', ' ').charAt(0).toUpperCase() + controlName.replace('_', ' ').slice(1)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }

    if (control?.hasError('maxlength')) {
      return `${controlName.replace('_', ' ').charAt(0).toUpperCase() + controlName.replace('_', ' ').slice(1)} must be no more than ${control.errors?.['maxlength'].requiredLength} characters`;
    }

    if (control?.hasError('pattern')) {
      if (controlName === 'username') {
        return 'Username can only contain letters, numbers, and underscores';
      }
    }

    if (controlName === 'password' && control?.errors) {
      const errors = control.errors;
      if (errors['missingUpperCase']) return 'Password must contain at least one uppercase letter';
      if (errors['missingLowerCase']) return 'Password must contain at least one lowercase letter';
      if (errors['missingNumbers']) return 'Password must contain at least one number';
    }
    
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.valid && (field.dirty || field.touched));
  }

  getPasswordStrength(): { score: number; label: string; color: string } {
    const password = this.signupForm.get('password')?.value;
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
} 