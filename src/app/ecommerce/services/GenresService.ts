import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthGuard } from 'src/app/guards/AuthGuardService';
import { IGenre } from '../EcommerceInterface';

@Injectable({
  providedIn: 'root',
})
export class GenresService {
  urlAPI = environment.urlAPI;
  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  getGenres(): Observable<IGenre[]> {
    const headers = this.getHeaders()
    
    return new Observable<IGenre[]>(subscriber => {
      this.http.get<any>(`${this.urlAPI}musicGenres`, { headers }).subscribe({
        next: (response) => {
          
          let genres: IGenre[] = [];
          
          // Handle different response formats
          if (Array.isArray(response)) {
            // If the response is a direct array (MongoDB format)
            genres = response.map(item => ({
              IdMusicGenre: item._id || item.IdMusicGenre || item.idMusicGenre || '',
              NameMusicGenre: item.nameMusicGenre || item.NameMusicGenre || '',
              TotalGroups: item.totalGroups || item.TotalGroups || 0
            }));
          } else if (response && response.$values && Array.isArray(response.$values)) {
            // If the response has a $values property
            genres = response.$values.map((item: any) => ({
              IdMusicGenre: item._id || item.IdMusicGenre || item.idMusicGenre || '',
              NameMusicGenre: item.nameMusicGenre || item.NameMusicGenre || '',
              TotalGroups: item.totalGroups || item.TotalGroups || 0
            }));
          } else if (response && response.data && Array.isArray(response.data)) {
            // If the response has a data property
            genres = response.data.map((item: any) => ({
              IdMusicGenre: item._id || item.IdMusicGenre || item.idMusicGenre || '',
              NameMusicGenre: item.nameMusicGenre || item.NameMusicGenre || '',
              TotalGroups: item.totalGroups || item.TotalGroups || 0
            }));
          } else {
            console.warn('Unexpected response format:', response);
          }
          
          subscriber.next(genres);
          subscriber.complete();
        },
        error: (error) => {
          console.error('Error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error complete:', error);
          subscriber.error(error);
        }
      });
    });
  }

  addGenre(genre: IGenre): Observable<IGenre> {
    const headers = this.getHeaders();
    
    // Create the request body with backend's expected property names
    const requestBody = {
      nameMusicGenre: genre.NameMusicGenre,
      totalGroups: genre.TotalGroups || 0
    };
    
    return new Observable<IGenre>(subscriber => {
      this.http.post<any>(
        `${this.urlAPI}musicGenres`,
        requestBody,
        { 
          headers: headers.set('Content-Type', 'application/json')
        }
      ).subscribe({
        next: (response) => {
          // Map backend response to IGenre
          const result: IGenre = {
            IdMusicGenre: response._id || response.IdMusicGenre || 0,
            NameMusicGenre: response.nameMusicGenre || response.NameMusicGenre || '',
            TotalGroups: response.totalGroups || response.TotalGroups || 0
          };
          subscriber.next(result);
          subscriber.complete();
        },
        error: (error) => {
          console.error('Error adding genre:', error);
          if (error.error) {
            console.error('Error details:', error.error);
          }
          subscriber.error(error);
        }
      });
    });
  }

  updateGenre(genre: IGenre): Observable<IGenre> {
    const headers = this.getHeaders();
    
    if (!genre.IdMusicGenre) {
      return new Observable<IGenre>(subscriber => {
        subscriber.error(new Error('Cannot update: Invalid genre ID'));
      });
    }
    
    // Create the request body with backend's expected property names
    const requestBody = {
      _id: genre.IdMusicGenre,
      nameMusicGenre: genre.NameMusicGenre,
      totalGroups: genre.TotalGroups || 0
    };
    
    return new Observable<IGenre>(subscriber => {
      this.http.put<any>(
        `${this.urlAPI}musicGenres/${genre.IdMusicGenre}`,
        requestBody,
        { 
          headers: headers.set('Content-Type', 'application/json')
        }
      ).subscribe({
        next: (response) => {
          // Map backend response to IGenre
          const result: IGenre = {
            IdMusicGenre: response._id || response.IdMusicGenre || genre.IdMusicGenre,
            NameMusicGenre: response.nameMusicGenre || response.NameMusicGenre || genre.NameMusicGenre,
            TotalGroups: response.totalGroups || response.TotalGroups || 0
          };
          subscriber.next(result);
          subscriber.complete();
        },
        error: (error) => {
          console.error('Error updating genre:', error);
          if (error.error) {
            console.error('Error details:', error.error);
          }
          subscriber.error(error);
        }
      });
    });
  }

  deleteGenre(idMusicGenre: number): Observable<IGenre> {
    // Validate the ID before making the request
    if (!idMusicGenre || idMusicGenre <= 0) {
      return new Observable<IGenre>(subscriber => {
        subscriber.error(new Error('Invalid genre ID'));
      });
    }
    
    const headers = this.getHeaders();
    
    return new Observable<IGenre>(subscriber => {
      this.http.delete<any>(`${this.urlAPI}musicGenres/${idMusicGenre}`, { headers }).subscribe({
        next: (response) => {
          // Handle different response formats
          const result: IGenre = {
            IdMusicGenre: idMusicGenre,
            NameMusicGenre: '',
            TotalGroups: 0
          };
          subscriber.next(result);
          subscriber.complete();
        },
        error: (error) => {
          console.error('Error:', error);
          subscriber.error(error);
        }
      });
    });
  }

  getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return headers;
  }
}
