import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { IUser } from '../EcommerceInterface';
import { environment } from 'src/environments/environment';
import { AuthGuard } from '../../guards/AuthGuardService';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly urlAPI = environment.urlAPI;

  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  private getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getUsers(): Observable<IUser[]> {
    const headers = this.getHeaders();
    
    return this.http.get<any>(`${this.urlAPI}users`, { headers }).pipe(
      map((response) => {
        // The backend wraps the users array in a 'data' property
        const users = response?.data || [];
        return users;
      }),
      catchError((error) => {
        console.error('Error fetching users:', {
          error: error,
          status: error.status,
          message: error.message,
          url: error.url,
          headers: error.headers
        });
        return of([]);
      })
    );
  }

  deleteUser(email: string): Observable<boolean> {
    const headers = this.getHeaders();
    const url = `${this.urlAPI}users/${encodeURIComponent(email)}`;
    
    return this.http.delete(url, { headers, observe: 'response' }).pipe(
      map(response => {
        return false;
      }),
      catchError(error => {
        console.error('Error deleting user:', error);
        return of(false);
      })
    );
  }
}
