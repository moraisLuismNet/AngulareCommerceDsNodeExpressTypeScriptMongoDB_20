import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ILoginResponse } from '../interfaces/LoginInterface';
import { UserService } from '../services/UserService';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private userService = inject(UserService);
  
  constructor(private router: Router) {}

  getRole(): string | null {
    try {
      // First check the separate userRole in sessionStorage
      const userRole = sessionStorage.getItem('userRole');
      if (userRole) {
        return userRole;
      }
      
      // Fall back to checking user object
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user?.role) {
          // Update the separate userRole for faster access
          sessionStorage.setItem('userRole', user.role);
          return user.role;
        }
      }
      
      // Try to get from token if available
      const token = this.getToken();
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded?.role) {
            // Normalize role to ensure consistent casing
            const role = decoded.role.charAt(0).toUpperCase() + decoded.role.slice(1).toLowerCase();
            
            // Update both user object and separate userRole
            if (userData) {
              const user = JSON.parse(userData);
              user.role = role;
              sessionStorage.setItem('user', JSON.stringify(user));
            }
            sessionStorage.setItem('userRole', role);
            return role;
          }
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
      
      // Default to 'User' role if no role is found
      return 'User';
    } catch (error) {
      console.error('Error in getRole:', error);
      return 'User'; // Default to User role on error
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    // Verify we have user data
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      console.log('No user data found');
      return false;
    }
    
    try {
      const user = JSON.parse(userData);
      const decoded: any = jwtDecode(token);
      
      // Verify email in token matches stored user data if email exists in token
      if (decoded.email && user.userEmail && decoded.email !== user.userEmail) {
        console.warn('Email mismatch between token and user data');
        this.clearAuthData();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying user data:', error);
      this.clearAuthData();
      return false;
    }
  }
  
  clearAuthData(): void {
    console.log('Clearing authentication data');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    // Also clear any user data in the UserService if needed
    this.userService.clearUser();
  }


  getUserEmail(): string {
    try {
      const infoUser = sessionStorage.getItem('user');
      if (infoUser) {
        const userInfo: ILoginResponse = JSON.parse(infoUser);
        return userInfo.userEmail || userInfo.email || '';
      }
    } catch (e) {
      console.error('Error getting user email:', e);
    }
    return '';
  }

  getToken(): string | null {
    try {
      // Try to get token from sessionStorage first
      const tokenFromStorage = sessionStorage.getItem('token');
      
      // If found and valid, return it
      if (tokenFromStorage && typeof tokenFromStorage === 'string') {
        return this.validateToken(tokenFromStorage);
      }
      
      // If not found, try to get from user object
      const userData = sessionStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const tokenFromUser = user?.token || user?.accessToken;
          
          if (tokenFromUser && typeof tokenFromUser === 'string') {
            // Store token directly for easier access
            sessionStorage.setItem('token', tokenFromUser);
            console.log('Token found in user object');
            return this.validateToken(tokenFromUser);
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in getToken:', error);
      return null;
    }
  }
  
  private validateToken(token: string): string | null {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn('Token expired');
        this.clearAuthData();
        return null;
      }
      
      return token;
    } catch (e) {
      console.error('Error validating token:', e);
      this.clearAuthData();
      return null;
    }
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    if (!this.isLoggedIn()) {
      console.log('AuthGuard - User not logged in, redirecting to login');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if the route requires administrator role
    const requiresAdmin = route.data['requiresAdmin'] || false;
    
    if (requiresAdmin) {
      const isAdmin = this.isAdmin();
      
      if (!isAdmin) {
        console.warn('AuthGuard - Access denied: User is not an admin');
        this.router.navigate(['/']);
        return false;
      }
    }
    
    return true;
  }

  isAdmin(): boolean {
    // Delegate to UserService's isAdmin() which now handles all cases
    const isAdmin = this.userService.isAdmin();
    
    return isAdmin;
  }

  /**
   * Get the current user's information
   * @returns User information including email and role, or null if not authenticated
   */
  getUser(): { email: string; role: string } | null {
    try {
      const userData = sessionStorage.getItem('user');
      if (!userData) {
        return null;
      }
      
      const user = JSON.parse(userData);
      const role = this.getRole();
      
      return {
        email: user.userEmail || user.email || '',
        role: role || 'User'
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }
  
  getCartId(): number | null {
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        const cartId = decodedToken['CartId'];
        return cartId !== undefined ? Number(cartId) : null;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    }
    return null;
  }
}
