import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class UserService implements OnDestroy {
  private readonly STORAGE_KEY = 'user';
  private readonly destroy$ = new Subject<void>();

  private readonly emailSubject = new BehaviorSubject<string | null>(null);
  private readonly roleSubject = new BehaviorSubject<string | null>(null);
  private readonly userLoggedOutSubject = new Subject<string>();

  readonly email$ = this.emailSubject.asObservable();
  readonly role$ = this.roleSubject.asObservable();
  readonly userLoggedOut$ = this.userLoggedOutSubject.asObservable();
  readonly emailUser$ = this.emailSubject.asObservable();

  constructor(private readonly router: Router) {
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    const userData = sessionStorage.getItem(this.STORAGE_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user?.userEmail) {
          this.emailSubject.next(user.userEmail);
          this.roleSubject.next(user.role || null);
        }
      } catch (error) {
        console.error('Error parsing user data from storage:', error);
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  setEmail(email: string): void {
    const currentEmail = this.emailSubject.value;
    if (currentEmail && currentEmail !== email) {
      this.cleanUserLocalData(currentEmail);
    }
    this.emailSubject.next(email);
    this.updateUserInStorage();
  }

  setRole(role: string): void {
    this.roleSubject.next(role);
    this.updateUserInStorage();
  }

  setUser(user: { email: string; role: string }): void {
    if (!user || !user.email) {
      console.warn('Cannot set user: Invalid user data', user);
      return;
    }

    // Normalize role to ensure consistent casing (Admin, User, etc.)
    const normalizedRole = user.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
      : 'User';

    this.emailSubject.next(user.email);
    this.roleSubject.next(normalizedRole);

    // Update both the user object and separate role in session storage
    sessionStorage.setItem('userRole', normalizedRole);
    this.updateUserInStorage();
  }

  private updateUserInStorage(): void {
    const userData = {
      userEmail: this.emailSubject.value,
      role: this.roleSubject.value,
      token: this.getToken(),
    };

    // Store the complete user object
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));

    // Also store role separately for faster access
    if (this.roleSubject.value) {
      sessionStorage.setItem('userRole', this.roleSubject.value);
    }
  }

  private getToken(): string | null {
    const userData = sessionStorage.getItem(this.STORAGE_KEY);
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.token || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private cleanUserLocalData(email: string): void {
    if (!email) return;

    const keys = [
      `${email}_cart`,
      `${email}_cartItemsCount`,
      `${email}_cartItems`,
    ];

    keys.forEach((key) => localStorage.removeItem(key));
  }

  get email(): string | null {
    return this.emailSubject.value;
  }

  getRole(): string | null {
    const role = this.roleSubject.value;
    return role;
  }

  clearUser(): void {
    const currentEmail = this.emailSubject.value;

    // Clear all user data
    this.emailSubject.next(null);
    this.roleSubject.next(null);

    // Clean up storage
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem('userRole');

    // Clean up local storage data for the user
    if (currentEmail) {
      this.cleanUserLocalData(currentEmail);
    }
  }

  clearEmail(): void {
    this.emailSubject.next(null);
  }

  clearRole(): void {
    this.roleSubject.next(null);
  }

  isAdmin(): boolean {
    // First check the roleSubject
    const role = this.roleSubject.value;
    if (role) {
      // Convert both to lowercase for case-insensitive comparison
      return role.toLowerCase() === 'admin';
    }

    // Fall back to session storage
    const sessionRole = sessionStorage.getItem('userRole');
    if (sessionRole) {
      return sessionRole.toLowerCase() === 'admin';
    }

    // Check the user object in session storage
    const userData = sessionStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user?.role) {
          return user.role.toLowerCase() === 'admin';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    return false;
  }

  redirectBasedOnRole(): void {
    this.router.navigate([this.isAdmin() ? '/genres' : '/']);
  }

  logout(): void {
    const currentEmail = this.emailSubject.value;
    if (currentEmail) {
      this.userLoggedOutSubject.next(currentEmail);
      this.clearUser();
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
