import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, map, catchError, throwError, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthGuard } from 'src/app/guards/AuthGuardService';
import { IGroup } from '../EcommerceInterface';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly urlAPI = environment.urlAPI;

  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  private getHeaders(): HttpHeaders {
    // Get fresh token for each request
    const token = this.authGuard.getToken();

    // For file uploads, we'll let the browser set the Content-Type with boundary
    // We'll only set the Authorization header if we have a token
    const headers: { [name: string]: string | string[] } = {
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  // Helper method to handle API requests with auth headers
  private request<T>(method: string, url: string, body?: any): Observable<T> {
    const headers = this.getHeaders();

    // For GET and DELETE requests, don't include the body in the options
    const options =
      method === 'GET' || method === 'DELETE' ? { headers } : { body, headers };

    return this.http.request<T>(method, url, options).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`API Error (${method} ${url}):`, error);
        if (error.error) {
          console.error('Error details:', error.error);
        }

        // Handle 401 Unauthorized
        if (error.status === 401) {
          console.warn('Authentication failed - redirecting to login');
          this.authGuard.clearAuthData();
        }

        return throwError(() => error);
      })
    );
  }

  getGroups(): Observable<IGroup[]> {
    return this.request<any>('GET', `${this.urlAPI}groups`).pipe(
      map((response: any) => {
        // Handle different response formats
        const groupsData = Array.isArray(response)
          ? response
          : response?.$values
          ? response.$values
          : response?.data
          ? response.data
          : [];

        // Map each group to IGroup format
        return groupsData.map((group: any) => ({
          IdGroup: group._id || group.IdGroup || 0,
          NameGroup: group.nameGroup || group.NameGroup || 'Unknown',
          ImageGroup: group.imageGroup || group.ImageGroup || null,
          Photo: null,
          PhotoName: group.imageGroup
            ? group.imageGroup.split('/').pop() || null
            : null,
          MusicGenreId:
            group.musicGenreId ||
            group.MusicGenreId ||
            group.musicGenre?._id ||
            0,
          NameMusicGenre:
            group.nameMusicGenre ||
            group.NameMusicGenre ||
            group.musicGenre?.NameMusicGenre ||
            'Unknown',
          totalRecords: group.totalRecords || group.TotalRecords || 0,
          TotalRecords: group.totalRecords || group.TotalRecords || 0,
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching groups:', error);
        if (error.error) {
          console.error('Error details:', error.error);
        }
        return of([]);
      })
    );
  }

  addGroup(formData: FormData): Observable<IGroup> {
    // Create a plain object to hold the form data
    const formDataObj: any = {};
    
    // Convert FormData to a plain object
    formData.forEach((value, key) => {
      formDataObj[key] = value;
    });

    // Get headers with authentication
    let headers = this.getHeaders();
    
    // Set content type to JSON since we're sending a JSON object
    headers = headers.set('Content-Type', 'application/json');

    // console.log('Sending request with data:', JSON.stringify(formDataObj));

    return this.http
      .post<IGroup>(
        `${this.urlAPI}groups`, 
        formDataObj,
        {
          headers: headers,
          withCredentials: true
        }
      )
      .pipe(
        map((response: any) => {
          return response;
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error adding group:', error);
          if (error.error) {
            console.error('Error status:', error.status);
            console.error('Error details:', error.error);
          }
          return throwError(() => error);
        })
      );
  }

  updateGroup(formData: FormData): Observable<IGroup> {
    // Get the group ID from the form data
    const groupId = formData.get('id');
    if (!groupId) {
      const error = new Error('Group ID is required for update');
      console.error('Validation error:', error.message);
      return throwError(() => error);
    }

    // Convert FormData to a plain object
    const updateData: any = {};
    formData.forEach((value, key) => {
      // Skip the 'id' field as it's in the URL
      if (key !== 'id') {
        updateData[key] = value;
      }
    });

    // Get headers with authentication
    const headers = this.getHeaders();
    
    // Set content type to JSON since we're sending a JSON object
    headers.set('Content-Type', 'application/json');

    return this.http.put<IGroup>(
      `${this.urlAPI}groups/${groupId}`,
      updateData,
      {
        headers: headers,
        withCredentials: true
      }
    ).pipe(
      map((response: any) => {
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating group:', {
          status: error.status,
          error: error.error,
          message: error.message,
          headers: error.headers
        });
        return throwError(() => error);
      })
    );
  }

  deleteGroup(id: number): Observable<IGroup> {
    if (!id) {
      const error = new Error('Group ID is required for deletion');
      console.error('Validation error:', error.message);
      return throwError(() => error);
    }

    return this.request<IGroup>('DELETE', `${this.urlAPI}groups/${id}`).pipe(
      map((response) => {
        return response || ({ IdGroup: id } as IGroup);
      }),
      catchError((error) => {
        console.error('Error deleting group:', error);
        if (error.error) {
          console.error('Error details:', error.error);
        }
        return throwError(() => error);
      })
    );
  }

  getGroupName(idGroup: string | number): Observable<string> {
    return this.request<any>('GET', `${this.urlAPI}groups/${idGroup}`).pipe(
      map((response) => {
        // Handle direct group object
        if (
          response &&
          typeof response === 'object' &&
          'nameGroup' in response
        ) {
          return response.nameGroup;
        }

        // Handle $values wrapper
        if (
          response &&
          response.$values &&
          typeof response.$values === 'object'
        ) {
          if (Array.isArray(response.$values) && response.$values.length > 0) {
            return response.$values[0].nameGroup || '';
          }
          if ('nameGroup' in response.$values) {
            return response.$values.nameGroup;
          }
        }

        return '';
      })
    );
  }
}
