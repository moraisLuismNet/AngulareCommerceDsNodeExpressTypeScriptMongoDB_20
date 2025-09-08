import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ILogin, ILoginResponse } from 'src/app/interfaces/LoginInterface';
import { AppService } from 'src/app/services/AppService';
import { AuthGuard } from 'src/app/guards/AuthGuardService';
import { UserService } from 'src/app/services/UserService';
import { CartService } from '../../ecommerce/services/CartService';
import { jwtDecode } from 'jwt-decode';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessagesModule } from 'primeng/messages';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    ToastModule,
    MessagesModule,
  ],
  templateUrl: './LoginComponent.html',
  styleUrls: ['./LoginComponent.css'],
  providers: [MessageService],
})
export class LoginComponent implements OnInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fLogin') loginForm!: NgForm;

  infoLogin: ILogin = {
    userEmail: '',
    password: '',
    role: '',
  };

  // Services injected using inject()
  private router = inject(Router);
  private appService = inject(AppService);
  private messageService = inject(MessageService);
  private authGuard = inject(AuthGuard);
  private userService = inject(UserService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  constructor() {}

  ngOnInit() {
    this.userService.setEmail(this.infoLogin.userEmail);
    if (this.authGuard.isLoggedIn()) {
      this.router.navigateByUrl('/ecommerce/listgroups');
    }
  }

  ngAfterViewInit() {
    if (this.emailInput) {
      this.emailInput.nativeElement.focus();
    }
  }

  login() {
    if (this.loginForm?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please enter valid email and password',
        life: 5000,
      });
      return;
    }

    const loginData: ILogin = {
      userEmail: this.infoLogin.userEmail.trim(),
      password: this.infoLogin.password,
      role: this.infoLogin.role,
    };

    this.appService
      .login(loginData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ILoginResponse) => {
          if (!response || !response.token) {
            console.error('No token received in login response');
            throw new Error('No token received from server');
          }

          try {
            // Clear any existing auth data first
            sessionStorage.clear();

            // Decode the token to get user info
            const decodedToken: any = response.token
              ? jwtDecode(response.token)
              : {};

            // Determine the role - check multiple possible locations
            const possibleRoles = [
              response.role,
              response.data?.role,
              decodedToken.role,
              decodedToken[
                'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
              ],
              'User', // Default fallback
            ];

            const userRole = possibleRoles.find(
              (r) => typeof r === 'string' && r.toLowerCase() === 'admin'
            )
              ? 'Admin'
              : 'User';

            const userEmail =
              response.userEmail ||
              response.email ||
              response.data?.email ||
              decodedToken.email ||
              decodedToken[
                'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
              ] ||
              this.infoLogin.userEmail;

            if (!userEmail) {
              throw new Error('No email found in login response');
            }

            // Store the token directly
            sessionStorage.setItem('token', response.token);

            // Store complete user data
            const userData = {
              userEmail: userEmail,
              token: response.token,
              role: userRole,
            };

            // Store user data in session storage
            sessionStorage.setItem('user', JSON.stringify(userData));

            // Store role separately for easier access
            sessionStorage.setItem('userRole', userRole);

            // Update the user service with both email and role
            this.userService.setUser({
              email: userEmail,
              role: userRole,
            });

            // Double check the role was set correctly
            setTimeout(() => {}, 100);

            // Skip cart data fetch for admin users and redirect to genres
            if (userRole.toLowerCase() === 'admin') {
              this.router.navigate(['/genres']);
              return;
            }
            
            // For non-admin users, fetch cart data and go to listgroups
            this.cartService.getCart(userEmail).subscribe({
              next: (cartResponse: any) => {
                this.router.navigate(['/ecommerce/listgroups']);
              },
              error: (error) => {
                console.warn('Error fetching cart data after login:', error);
                this.router.navigate(['/ecommerce/listgroups']);
              }
            });
          } catch (error) {
            console.error('Error processing login response:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Login Error',
              detail: 'Failed to process login response',
              life: 5000,
            });
          }
        },
        error: (error: any) => {
          console.error('Login error details:', {
            name: error.name,
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            error: error.error,
            headers: error.headers,
          });

          let errorMessage = 'An error occurred during login';
          if (error.status === 400) {
            errorMessage = 'Invalid email or password';
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
          } else if (error.status === 401) {
            errorMessage = 'Unauthorized. Please check your credentials.';
          } else if (error.status === 0) {
            errorMessage =
              'Unable to connect to the server. Please check your internet connection.';
          }

          console.error('Displaying error to user:', errorMessage);

          // Show error message to user
          this.messageService.add({
            severity: 'error',
            summary: 'Login Failed',
            detail: errorMessage,
            life: 5000,
          });
        },
      });
  }
}
