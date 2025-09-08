import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ICartDetail, IRecord } from '../EcommerceInterface';
import { UserService } from 'src/app/services/UserService';
import { StockService } from './StockService';
import { RecordsService } from './RecordsService';
import { AuthGuard } from 'src/app/guards/AuthGuardService';

@Injectable({
  providedIn: 'root',
})
export class CartDetailService {
  urlAPI = environment.urlAPI;
  private cart: IRecord[] = [];

  private getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    if (!token) {
      console.warn('No authentication token found');
      return new HttpHeaders({
        'Content-Type': 'application/json',
      });
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private stockService: StockService,
    private recordsService: RecordsService,
    private authGuard: AuthGuard
  ) {}

  getCartItemCount(email: string): Observable<any> {
    if (this.userService.email !== email) {
      return of({ totalItems: 0 });
    }
    return this.http
      .get(`${this.urlAPI}carts/${encodeURIComponent(email)}/count`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error getting cart item count:', error);
          return of({ totalItems: 0 });
        })
      );
  }

  getCartDetails(email: string): Observable<ICartDetail[]> {
    const headers = this.getHeaders();
    return this.getCartDetailsByEmail(email).pipe(
      catchError((error) => {
        console.error(
          'Error in getCartDetails, falling back to direct API call:',
          error
        );
        return this.getCartDetailsByEmail(email);
      })
    );
  }

  getRecordDetails(recordId: number): Observable<IRecord | null> {
    return this.http.get<IRecord>(`${this.urlAPI}records/${recordId}`).pipe(
      catchError((error) => {
        console.error('Error getting record details:', error);
        return of(null);
      })
    );
  }

  addToCartDetail(
    email: string,
    recordId: number,
    amount: number
  ): Observable<any> {
    const headers = this.getHeaders();
    return this.http
      .post<{ success: boolean; data: any; message: string }>(
        `${this.urlAPI}carts/add/${encodeURIComponent(email)}`,
        {
          recordId: recordId,
          amount: amount,
        },
        { headers }
      )
      .pipe(
        tap((response) => {
          if (response && response.success && response.data) {
            // Update stock if it comes in the response
            if (
              response.data.record &&
              response.data.record.stock !== undefined
            ) {
              this.stockService.notifyStockUpdate(
                recordId,
                response.data.record.stock
              );
            }

            return {
              id: recordId,
              stock: response.data.record?.stock,
              amount: amount,
              success: true,
              message: response.message,
            };
          } else {
            console.error(
              '[CartDetailService] Invalid response format:',
              response
            );
            return throwError(
              () => new Error(response?.message || 'Failed to add item to cart')
            );
          }
        }),
        catchError((error) => {
          console.error('[CartDetailService] Error in addToCartDetail:', error);
          return throwError(() => error);
        })
      );
  }

  removeFromCartDetail(
    email: string,
    recordId: number,
    amount: number
  ): Observable<any> {
    const headers = this.getHeaders();
    return this.http
      .post<{ success: boolean; data: any; message: string }>(
        `${this.urlAPI}carts/remove/${encodeURIComponent(email)}`,
        {
          recordId: recordId,
          amount: amount,
        },
        { headers }
      )
      .pipe(
        tap((response) => {
          if (response && response.success && response.data) {
            // Update stock if it comes in the response
            if (
              response.data.record &&
              response.data.record.stock !== undefined
            ) {
              this.stockService.notifyStockUpdate(
                recordId,
                response.data.record.stock
              );
            }
          } else {
            throw new Error(
              response?.message || 'Failed to remove item from cart'
            );
          }
          return response;
        }),
        catchError((error) => {
          console.error(
            '[CartDetailService] Error in removeFromCartDetail:',
            error
          );
          return throwError(() => error);
        })
      );
  }

  addAmountCartDetail(detail: ICartDetail): Observable<ICartDetail> {
    return this.http.put<ICartDetail>(
      `${this.urlAPI}cart-details/${detail.IdCartDetail}`,
      detail
    );
  }

  updateRecordStock(recordId: number, change: number): Observable<IRecord> {
    if (typeof change !== 'number' || isNaN(change)) {
      return throwError(() => new Error('Invalid stock change value'));
    }

    return this.http
      .put<any>(
        `${this.urlAPI}records/${recordId}/stock/${change}`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(
        tap((response) => {
          const newStock = response?.newStock;
          if (typeof newStock === 'number' && newStock >= 0) {
            this.stockService.notifyStockUpdate(recordId, newStock);
          } else {
            throw new Error('Received invalid stock value from server');
          }
        }),
        map(
          (response) =>
            ({
              IdRecord: recordId,
              stock: response.newStock,
              TitleRecord: '',
              YearOfPublication: null,
              ImageRecord: null,
              Photo: null,
              Price: 0,
              Discontinued: false,
              GroupId: null,
              GroupName: '',
              NameGroup: '',
            } as IRecord)
        ),
        catchError((error) => {
          return throwError(
            () => new Error('Failed to update stock. Please try again.')
          );
        })
      );
  }

  incrementQuantity(detail: ICartDetail): Observable<ICartDetail> {
    const previousAmount = detail.Amount;
    detail.Amount++;
    return new Observable((observer) => {
      this.addAmountCartDetail(detail).subscribe({
        next: () => {
          this.updateRecordStock(detail.RecordId, -1).subscribe({
            next: () => {
              observer.next(detail);
              observer.complete();
            },
            error: (err) => {
              detail.Amount = previousAmount;
              observer.error(err);
            },
          });
        },
        error: (err) => {
          detail.Amount = previousAmount;
          observer.error(err);
        },
      });
    });
  }

  decrementQuantity(detail: ICartDetail): Observable<ICartDetail> {
    if (detail.Amount <= 1) {
      // Do not allow quantities less than 1
      return of(detail); // Return the detail without changes
    }
    const previousAmount = detail.Amount;
    detail.Amount--;
    return new Observable((observer) => {
      this.addAmountCartDetail(detail).subscribe({
        next: () => {
          this.updateRecordStock(detail.RecordId, 1).subscribe({
            next: () => {
              observer.next(detail);
              observer.complete();
            },
            error: (err) => {
              detail.Amount = previousAmount;
              observer.error(err);
            },
          });
        },
        error: (err) => {
          detail.Amount = previousAmount;
          observer.error(err);
        },
      });
    });
  }

  getCartDetailsByEmail(email: string): Observable<ICartDetail[]> {
    const url = `${this.urlAPI}carts/${encodeURIComponent(email)}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map((response) => this.mapCartResponse(response)),
      catchError((error) => {
        console.error('Error in getCartDetailsByEmail:', error);
        return throwError(() => error);
      })
    );
  }

  private mapCartResponse(response: any): ICartDetail[] {
    // Handle different response formats
    let items = [];

    if (Array.isArray(response)) {
      items = response;
    } else if (response?.items) {
      items = response.items;
    } else if (response?.$values) {
      items = response.$values;
    } else if (response) {
      items = [response];
    }

    return items.map((item: any) => this.mapCartItem(item));
  }

  private mapCartItem(item: any): ICartDetail {
    const recordDetails = item.recordDetails || item.record || {};
    const amount = item.amount || item.Amount || 0;
    const price = item.price || item.Price || 0;
    const recordId = item.recordId || item.RecordId || 0;
    const cartId = item.cartId || item.CartId || 0;
    const title =
      recordDetails.title ||
      recordDetails.TitleRecord ||
      item.title ||
      item.Title ||
      'No title';
    const image =
      recordDetails.image ||
      recordDetails.ImageRecord ||
      item.image ||
      item.Image ||
      '';
    const groupName =
      recordDetails.groupName ||
      recordDetails.GroupName ||
      item.groupName ||
      item.GroupName ||
      '';
    const idCartDetail = item.idCartDetail || item.IdCartDetail || recordId;
    const stock = recordDetails.stock || item.stock || 0;

    return {
      // PascalCase properties
      RecordTitle: title,
      IdCartDetail: idCartDetail,
      RecordId: recordId,
      Amount: amount,
      CartId: cartId,
      TitleRecord: title,
      GroupName: groupName,
      Price: price,
      Total: price * amount,

      // camelCase properties for template compatibility
      idCartDetail,
      recordId,
      amount,
      cartId,
      titleRecord: title,
      groupName,
      price,
      total: price * amount,
      imageRecord: image,

      // Record information
      record: {
        stock,
        data: { stock },
      },
    };
  }
}
