import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ILogin, ILoginResponse } from '../interfaces/LoginInterface';

interface LoginApiResponse {
  success: boolean;
  message: string;
  data?: {
    email?: string;
    token: string;
    role?: string;
  };
}

export interface IRegister {
  email: string;
  password: string;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppService {
  urlAPI: string;

  constructor(private http: HttpClient) {
    this.urlAPI = environment.urlAPI;
  }

  login(loginData: ILogin): Observable<ILoginResponse> {
    // Ensure we're using the correct property names expected by the backend
    const loginPayload = {
      userEmail: loginData.userEmail.trim(),
      password: loginData.password
    };

    return this.http.post<any>(
      `${this.urlAPI}auth/login`,
      loginPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true,
        observe: 'response' as const
      }
    ).pipe(
      map(response => {

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseBody = response.body;

        let token: string | undefined;
        let email: string | undefined;
        let role: string | undefined;

        // Extract data from response
        if (responseBody && 'data' in responseBody && responseBody.data) {
          // Response has a data property containing the user info
          const data = responseBody.data;
          token = data.token || data.accessToken || responseBody.token;
          email = data.email || data.userEmail || responseBody.email || loginData.userEmail;
          role = data.role || responseBody.role || 'User';
        } else if (responseBody && ('token' in responseBody || 'accessToken' in responseBody)) {
          // Direct response with token
          token = responseBody.token || responseBody.accessToken;
          email = responseBody.email || responseBody.userEmail || loginData.userEmail;
          role = responseBody.role || 'User';
        } else if (responseBody && 'success' in responseBody) {
          // Success/failure response with token in the root
          if (responseBody.success === false) {
            throw new Error(responseBody.message || 'Login failed');
          }
          token = responseBody.token || responseBody.accessToken;
          email = responseBody.email || responseBody.userEmail || loginData.userEmail;
          role = responseBody.role || 'User';
        } else {
          console.error('Unexpected response format:', responseBody);
          throw new Error('Invalid response format');
        }

        // Normalize role to ensure consistent casing
        if (role) {
          role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        }

        if (!token) {
          throw new Error('No token found in response');
        }

        if (!email) {
          throw new Error('No email found in response');
        }

        return {
          token,
          userEmail: email,
          role: role || 'User'
        } as ILoginResponse;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', error);

        // Log headers if available
        if (error.headers) {
          error.headers.keys().forEach(key => {
            console.error(`${key}: ${error.headers.get(key)}`);
          });
        }

        // Log the raw error if available
        if (error.error) {
          console.error('=== RAW ERROR RESPONSE ===');
          try {
            if (typeof error.error === 'string') {
              console.error('Error as string:', error.error);
            } else if (error.error instanceof Blob) {
              // If it's a Blob, try to read it as text
              error.error.text().then(text => {
                console.error('Error from Blob:', text);
              }).catch(e => console.error('Error reading Blob:', e));
            } else {
              console.error('Error as object:', JSON.stringify(error.error, null, 2));
            }
          } catch (e) {
            console.error('Could not parse error details:', e);
          }
        }

        // Create a more descriptive error message based on the error type
        let errorMessage: string;

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client error: ${error.error.message}`;
        } else if (error.status === 400) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
          if (error.error && typeof error.error === 'object' && 'message' in error.error) {
            errorMessage = error.error.message as string;
          }
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please check your credentials.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = 'An unexpected error occurred. Please try again.';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  register(user: IRegister) {
    return this.http.post<any>(`${this.urlAPI}auth/register`, user);
  }
}
