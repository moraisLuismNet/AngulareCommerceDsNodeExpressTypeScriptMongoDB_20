import { Component, afterNextRender, ElementRef, ViewChild, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { IRegister } from 'src/app/interfaces/RegisterInterface';
import { AppService } from 'src/app/services/AppService';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
    selector: 'app-register',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        InputTextModule,
        ButtonModule,
        PasswordModule,
        ToastModule,
        MessagesModule,
        ProgressBarModule
    ],
    templateUrl: './RegisterComponent.html',
    styleUrls: ['./RegisterComponent.css'],
    providers: [MessageService]
})
export class RegisterComponent {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  @ViewChild('registerForm') registerForm!: ElementRef<HTMLFormElement>;
  
  usuario: IRegister = { email: '', password: '' };
  registrationError: string | null = null;
  
  // Form state
  isFormValid: boolean = false;
  passwordStrength: 'weak' | 'medium' | 'strong' | '' = '';
  showPassword: boolean = false;

  // Services injected using inject()
  private appService = inject(AppService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Runs once after initial rendering
    afterNextRender(() => {
      this.initializeForm();
      this.setupFormValidation();
      this.updateFormState();
    });
  }

  private initializeForm(): void {
    // Focus automatically on the email field
    if (this.emailInput) {
      this.emailInput.nativeElement.focus();
    }
  }

  private setupFormValidation(): void {
    if (this.registerForm) {
      const form = this.registerForm.nativeElement;
      const inputs = form.querySelectorAll('input');
      
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          this.validateForm();
        });
      });
    }
  }

  private validateForm(): void {
    // Basic validation of required fields
    if (!this.usuario.email || !this.usuario.password) {
      this.isFormValid = false;
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(this.usuario.email);
    
    // Password strength validation
    this.checkPasswordStrength(this.usuario.password);
    
    // The form is valid if the email is correct and the password is strong
    this.isFormValid = isEmailValid && this.passwordStrength === 'strong';
  }

  private checkPasswordStrength(password: string): void {
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasMinLength, hasNumber, hasLetter, hasSpecialChar].filter(Boolean).length;
    
    if (password.length === 0) {
      this.passwordStrength = '';
    } else if (strength <= 2) {
      this.passwordStrength = 'weak';
    } else if (strength === 3) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  private updateFormState(): void {
    // Update the state of the submit button
    const submitButton = this.registerForm?.nativeElement?.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = !this.isFormValid;
      submitButton.style.opacity = this.isFormValid ? '1' : '0.6';
      submitButton.style.cursor = this.isFormValid ? 'pointer' : 'not-allowed';
    }
    
    // Update the password strength indicator
    this.updatePasswordStrengthIndicator();
  }
  
  private updatePasswordStrengthIndicator(): void {
    const indicator = document.querySelector('.password-strength');
    if (!indicator) return;
    
    // Clear previous classes
    indicator.className = 'password-strength';
    
    // Add class based on strength
    if (this.passwordStrength === 'weak') {
      indicator.classList.add('weak');
    } else if (this.passwordStrength === 'medium') {
      indicator.classList.add('medium');
    } else if (this.passwordStrength === 'strong') {
      indicator.classList.add('strong');
    }
  }
  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    if (this.passwordInput) {
      this.passwordInput.nativeElement.type = this.showPassword ? 'text' : 'password';
    }
  }

  onSubmit(form: any) {
    if (form.valid) {
      this.appService.register(this.usuario).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Registration successful',
            detail: 'User successfully registered',
          });

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500); // Wait 1.5 seconds before redirecting
        },
        error: (err) => {
          console.error('Error registering user:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Registration error',
            detail: 'The user could not be registered. Please try again.',
          });
        },
      });
    }
  }
}
