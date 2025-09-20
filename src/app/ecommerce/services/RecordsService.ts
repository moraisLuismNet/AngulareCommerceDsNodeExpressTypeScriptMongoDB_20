import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthGuard } from 'src/app/guards/AuthGuardService';
import { IRecord } from '../EcommerceInterface';
import { StockService } from './StockService';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {
  urlAPI = environment.urlAPI;
  constructor(
    private http: HttpClient,
    private authGuard: AuthGuard,
    private stockService: StockService
  ) {}

  /**
   * Get HTTP headers with authorization token
   */
  getHeaders(): HttpHeaders {
    // If not logged in, return empty headers without logging warnings
    if (!this.authGuard.isLoggedIn()) {
      return new HttpHeaders();
    }

    let token: string | null = null;
    
    // Try to get token from AuthGuard
    try {
      token = this.authGuard.getToken();
    } catch (e) {
      // Only log in development
      if (isDevMode()) {
        console.warn('Error getting token from AuthGuard:', e);
      }
    }
    
    // Fall back to sessionStorage and localStorage
    if (!token) {
      token = sessionStorage.getItem('token') || localStorage.getItem('token');
    }
    
    if (!token) {
      if (isDevMode()) {
        console.warn('No authentication token found');
      }
      return new HttpHeaders();
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getRecords(): Observable<IRecord[]> {
    const headers = this.getHeaders();

    return this.http
      .get<any>(`${this.urlAPI}records`, {
        headers,
        observe: 'response', // Get full response including status and headers
      })
      .pipe(
        map((response) => {
          const body = response.body;

          if (!body) {
            console.warn('Empty response body');
            return [];
          }

          // Handle different possible response structures
          const records =
            body.$values || body.data || (Array.isArray(body) ? body : []);

          if (!Array.isArray(records)) {
            console.warn(
              'Unexpected response format, expected an array but got:',
              typeof records
            );
            return [];
          }

          // Map MongoDB _id to IdRecord and ensure both are set
          return records.map((record) => ({
            ...record,
            _id: record._id || undefined,
            IdRecord: record.IdRecord || record._id || 0,
          }));
        }),
        tap((records) => {
          records.forEach((record) => {
            this.stockService.notifyStockUpdate(record.IdRecord, record.Stock);
          });
        }),
        catchError((error) => {
          console.error('Error in getRecords:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error response:', error.error);
          return throwError(() => error);
        })
      );
  }

  addRecord(record: IRecord): Observable<IRecord> {
    
    // Validate required fields
    const title = (record.TitleRecord || record.title || '').trim();
    const groupId = record.GroupId?.toString() || '';
    
    if (!title || !groupId) {
      console.error('Validation failed - missing title or groupId');
      return throwError(() => new Error('Title and Group ID are required'));
    }

    // Create form data
    const formData = new URLSearchParams();
    
    // Add required fields
    formData.append('title', title);
    formData.append('yearOfPublication', (record.YearOfPublication?.toString() || '').trim());
    formData.append('price', (record.Price?.toString() || '0').trim());
    formData.append('stock', (record.stock?.toString() || '0').trim());
    formData.append('discontinued', (record.Discontinued?.toString() || 'false').trim());
    formData.append('GroupId', groupId);
    
    // Add optional fields if present
    const nameGroup = (record.NameGroup || record.nameGroup || '').trim();
    if (nameGroup) {
      formData.append('nameGroup', nameGroup);
    }
    
    // Add imageRecord if present
    if (record.imageRecord) {
      formData.append('imageRecord', record.imageRecord);
    } else {
      console.log('No imageRecord present in the record object');
    }
    
    // Add photo if present
    if (record.Photo) {
      const fileFormData = new FormData();
      fileFormData.append('imageRecord', record.Photo, record.Photo.name || 'record-photo');
      
      // Add other fields to FormData
      formData.forEach((value, key) => {
        fileFormData.append(key, value.toString());
      });
      
      const fileHeaders = this.getHeaders();
      // Remove Content-Type header
      const uploadHeaders = new HttpHeaders();
      
      // Copy all headers except Content-Type
      fileHeaders.keys().forEach(key => {
        const headerValue = fileHeaders.get(key);
        if (headerValue && key.toLowerCase() !== 'content-type') {
          uploadHeaders.set(key, headerValue);
        }
      });
      
      return this.http.post<IRecord>(`${this.urlAPI}records`, fileFormData, { 
        headers: uploadHeaders 
      }).pipe(
        tap(response => console.log('Record created with file:', response)),
        catchError(error => {
          console.error('Error creating record with file:', error);
          return throwError(() => error);
        })
      );
    }
    
    // If there is an image URL, add it to the form.
    if (record.imageRecord) {
      formData.append('imageRecord', record.imageRecord);
    }

    // Send as normal form data
    const formHeaders = this.getHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    return this.http.post<IRecord>(
      `${this.urlAPI}records`,
      formData.toString(),
      { 
        headers: formHeaders,
        withCredentials: true
      }
    ).pipe(
      
      catchError(error => {
        console.error('Error adding record:', error);
        return throwError(() => error);
      })
    );
  }

  updateRecord(record: IRecord & { _id?: string }): Observable<IRecord> {
    // Get token from sessionStorage (where login stores it) or fall back to localStorage
    let token =
      sessionStorage.getItem('token') || localStorage.getItem('token');

    if (!token) {
      console.error(
        'No authentication token found in sessionStorage or localStorage'
      );
      return throwError(
        () => new Error('Authentication required - Please log in again')
      );
    }

    // Create headers with the token and JSON content type
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Prepare the update data object
    const updateData: any = {
      title: record.TitleRecord,
      yearOfPublication: record.YearOfPublication,
      price: record.Price,
      stock: record.stock,
      discontinued: record.Discontinued,
      nameGroup: record.NameGroup,
      Group: record.GroupId,
      imageRecord: record.ImageRecord || undefined,
      PhotoName: record.PhotoName || undefined
    };

    // Clean up undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // Use _id (MongoDB) if available, otherwise fall back to IdRecord (frontend)
    const recordId = ('_id' in record && record._id) || record.IdRecord?.toString();

    if (!recordId) {
      const errorMsg =
        'No valid ID found in record. Record must have either _id (MongoDB) or IdRecord (frontend) property';
      console.error(errorMsg, record);
      return throwError(() => new Error(errorMsg));
    }

    const url = `${this.urlAPI}records/${recordId}`;

    return this.http
      .put<any>(url, updateData, {
        headers,
        observe: 'response',
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          // If the response body is empty, return the updated record
          if (!response.body) {
            console.warn(
              'Server response body is empty, returning updated record'
            );
            return {
              ...record,
              // Ensure the updated fields are included
              YearOfPublication: record.YearOfPublication,
              Price: record.Price,
              stock: record.stock,
              Discontinued: record.Discontinued,
            };
          }

          // If the response body is not empty, extract the relevant data
          const responseData = response.body.data || response.body;

          // Map the response data to the IRecord interface
          const updatedRecord = {
            _id: responseData._id || record._id,
            IdRecord:
              responseData.IdRecord || responseData._id || record.IdRecord,
            TitleRecord:
              responseData.TitleRecord ||
              responseData.title ||
              record.TitleRecord,
            YearOfPublication:
              responseData.YearOfPublication !== undefined
                ? responseData.YearOfPublication
                : responseData.yearOfPublication !== undefined
                ? responseData.yearOfPublication
                : record.YearOfPublication,
            Price:
              responseData.Price !== undefined
                ? responseData.Price
                : responseData.price !== undefined
                ? responseData.price
                : record.Price,
            stock:
              responseData.stock !== undefined
                ? responseData.stock
                : responseData.Stock !== undefined
                ? responseData.Stock
                : record.stock,
            Discontinued:
              responseData.Discontinued !== undefined
                ? responseData.Discontinued
                : responseData.discontinued !== undefined
                ? responseData.discontinued
                : record.Discontinued,
            GroupId:
              responseData.GroupId || responseData.Group || record.GroupId,
            NameGroup:
              responseData.NameGroup ||
              responseData.nameGroup ||
              record.NameGroup,
            GroupName:
              responseData.GroupName ||
              responseData.nameGroup ||
              record.GroupName,
            ImageRecord:
              responseData.ImageRecord ||
              responseData.imageRecord ||
              record.ImageRecord,
            Photo: record.Photo, // We will keep the photo file if it exists.
            PhotoName:
              responseData.PhotoName ||
              responseData.photoName ||
              record.PhotoName,
          };

          return updatedRecord as IRecord;
        }),
        catchError((error: any) => {
          // Extract and log validation errors if they exist
          if (error.error && typeof error.error === 'object') {
            const validationErrors = [];
            for (const key in error.error) {
              if (error.error.hasOwnProperty(key)) {
                validationErrors.push(`${key}: ${error.error[key]}`);
              }
            }
            if (validationErrors.length > 0) {
              console.error('Validation errors:', validationErrors);
            }
          }

          return throwError(() => ({
            status: error.status,
            message: error.error?.message || error.message,
            errors: error.error?.errors || null,
          }));
        })
      );
  }

  deleteRecord(id: number): Observable<IRecord> {
    // Get token from sessionStorage or localStorage
    const token =
      sessionStorage.getItem('token') || localStorage.getItem('token');

    if (!token) {
      const error = new Error('No authentication token found') as any;
      console.error('Authentication error:', error);
      return throwError(() => error);
    }

    return new Observable<IRecord>((subscriber) => {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', `${this.urlAPI}records/${id}`, true);

      // Set headers
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        try {
          let responseData;
          try {
            responseData = xhr.responseText
              ? JSON.parse(xhr.responseText)
              : null;
          } catch (e) {
            responseData = xhr.responseText;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            // Successful deletion
            subscriber.next(responseData || { success: true });
            subscriber.complete();
          } else {
            const error = new Error(
              xhr.statusText || 'Error deleting record'
            ) as any;
            error.status = xhr.status;
            error.response = responseData;
            console.error('Delete error:', error);
            subscriber.error(error);
          }
        } catch (e) {
          console.error('Error processing delete response:', e);
          subscriber.error(e);
        }
      };

      xhr.onerror = () => {
        const error = new Error('Network error during delete operation');
        console.error('Network error during delete:', error);
        subscriber.error(error);
      };

      xhr.send();

      // Cleanup function
      return () => xhr.abort();
    });
  }

  getRecordsByGroup(idGroup: string | number): Observable<IRecord[]> {
    const headers = this.getHeaders();
    return this.http
      .get<any>(`${this.urlAPI}groups/${idGroup}`, {
        headers,
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const body = response.body;
          if (!body) {
            console.warn('Empty response body');
            return [];
          }

          // Handle different possible response structures
          let records = [];
          let groupData = null;

          if (body.success && body.data) {
            if (body.data.Records) {
              records = body.data.Records;
              groupData = body.data;
            } else {
              records = body.data;
            }
          } else if (body.$values) {
            records = body.$values;
          } else if (Array.isArray(body)) {
            records = body;
          }

          if (!Array.isArray(records)) {
            console.warn(
              'Unexpected response format, expected an array but got:',
              typeof records
            );
            return [];
          }

          const groupName = groupData
            ? groupData.nameGroup || groupData.NameGroup || ''
            : '';

          // Map MongoDB _id to IdRecord and ensure both are set
          return records.map(
            (record: any) =>
              ({
                ...record,
                _id: record._id || undefined,
                IdRecord: record.IdRecord || record._id || 0,
                TitleRecord: record.title || record.TitleRecord || '',
                YearOfPublication:
                  record.yearOfPublication || record.YearOfPublication || null,
                Price: parseFloat(record.price || record.Price) || 0,
                stock: record.stock || record.Stock || 0,
                Discontinued:
                  record.discontinued || record.Discontinued || false,
                GroupId: groupData
                  ? groupData._id || groupData.IdGroup
                  : record.GroupId || null,
                GroupName: groupData
                  ? groupData.nameGroup || groupData.NameGroup
                  : record.GroupName || '',
                NameGroup: groupData
                  ? groupData.nameGroup || groupData.NameGroup
                  : record.NameGroup || '',
                ImageRecord: record.imageRecord || record.ImageRecord || null,
                Photo: record.Photo || null,
                PhotoName:
                  record.PhotoName ||
                  (record.imageRecord || record.ImageRecord
                    ? (record.imageRecord || record.ImageRecord)
                        .split('/')
                        .pop()
                    : null),
              } as IRecord)
          );
        }),
        tap((records) => {
          records.forEach((record) => {
            if (record && record.IdRecord && record.stock !== undefined) {
              this.stockService.notifyStockUpdate(
                record.IdRecord,
                record.stock
              );
            }
          });
        })
      );
  }

  // getHeaders() method is defined at the top of the class

  decrementStock(idRecord: number): Observable<any> {
    const headers = this.getHeaders();
    const amount = -1;
    return this.http
      .put(
        `${this.urlAPI}records/${idRecord}/updateStock/${amount}`,
        {},
        { headers }
      )
      .pipe(
        tap(() => {
          this.stockService.notifyStockUpdate(idRecord, amount);
        })
      );
  }

  incrementStock(idRecord: number): Observable<any> {
    const headers = this.getHeaders();
    const amount = 1;
    return this.http
      .put(
        `${this.urlAPI}records/${idRecord}/updateStock/${amount}`,
        {},
        { headers }
      )
      .pipe(
        tap(() => {
          this.stockService.notifyStockUpdate(idRecord, amount);
        })
      );
  }

  getRecordById(id: string | number): Observable<IRecord> {
    const headers = this.getHeaders();
    return this.http
      .get<any>(`${this.urlAPI}records/${id}`, { headers })
      .pipe(
        map(response => {
          const recordData = response.data || response;
          
          // Comprehensive mapping to ensure all properties are consistent
          const mappedRecord: IRecord = {
            ...recordData,
            _id: recordData._id,
            IdRecord: recordData.IdRecord || recordData._id,
            TitleRecord: recordData.title || recordData.TitleRecord || '',
            YearOfPublication: recordData.yearOfPublication || recordData.YearOfPublication || null,
            Price: parseFloat(recordData.price || recordData.Price) || 0,
            stock: recordData.stock !== undefined ? recordData.stock : recordData.Stock,
            Discontinued: recordData.discontinued || recordData.Discontinued || false,
            GroupId: recordData.GroupId || (recordData.Group ? recordData.Group._id : null),
            GroupName: recordData.GroupName || (recordData.Group ? recordData.Group.nameGroup : ''),
            NameGroup: recordData.NameGroup || (recordData.Group ? recordData.Group.nameGroup : ''),
            ImageRecord: recordData.imageRecord || recordData.ImageRecord || null,
          };
          return mappedRecord;
        }),
        catchError((error) => {
          console.error(`Error fetching record by id ${id}:`, error);
          return throwError(() => error);
        })
      );
  }
}
