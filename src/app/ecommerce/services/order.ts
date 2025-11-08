import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { catchError, map, Observable, of, tap } from "rxjs";
import { IOrder, IOrderDetail } from "../ecommerce.interface";
import { AuthGuard } from "src/app/guards/auth-guard";

@Injectable({
  providedIn: "root",
})
export class OrderService {
  urlAPI = environment.urlAPI;

  constructor(private http: HttpClient, private authGuard: AuthGuard) {}

  private getHeaders(): HttpHeaders {
    const token = this.authGuard.getToken();
    return new HttpHeaders({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  createOrderFromCart(
    userEmail: string,
    paymentMethod: string
  ): Observable<IOrder> {
    const headers = this.getHeaders();
    return this.http.post<IOrder>(
      `${this.urlAPI}orders/create/${encodeURIComponent(userEmail)}`,
      { paymentMethod },
      { headers }
    );
  }

  getAllOrders(): Observable<IOrder[]> {
    return this.http
      .get<any>(`${this.urlAPI}orders`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response: any) => {
          // Check if response has the expected structure with data array
          if (response && response.success && Array.isArray(response.data)) {
            return response.data.map((order: any) =>
              this.normalizeOrder(order)
            );
          }

          // Fallback: check if response is directly an array
          if (Array.isArray(response)) {
            console.log(`Found ${response.length} orders in direct response`);
            return response.map((order: any) => this.normalizeOrder(order));
          }

          console.warn("Unexpected response format:", response);
          return [];
        }),
        catchError((error) => {
          console.error("Error loading all orders:", error);
          return of([]);
        })
      );
  }

  getOrdersByUserEmail(email: string): Observable<IOrder[]> {
    return this.http
      .get<{ success: boolean; data: any[]; message?: string }>(
        `${this.urlAPI}orders/${encodeURIComponent(email)}`,
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        map((response) => {
          const orders = response?.data || [];
          if (!Array.isArray(orders)) {
            console.warn("Expected orders to be an array, got:", typeof orders);
            return [];
          }
          return orders.map((order: any) => this.normalizeOrder(order));
        }),
        catchError((error) => {
          console.error("Error processing orders:", error);
          return of([]);
        })
      );
  }

  private normalizeOrder(order: any): IOrder {
    if (!order) {
      console.warn("normalizeOrder called with null/undefined order");
      return this.getEmptyOrder();
    }

    try {
      // Map the data from the API to the IOrder interface
      // The API can return details as 'items' or 'orderDetails' and the ID as '_id' or 'idOrder'
      let details = [];

      if (Array.isArray(order.items)) {
        details = order.items;
      } else if (Array.isArray(order.OrderDetails)) {
        details = order.OrderDetails;
      } else if (Array.isArray(order.orderDetails)) {
        details = order.orderDetails;
      }

      const normalizedDetails = Array.isArray(details)
        ? details.map((detail, index) => {
            const normalized = this.normalizeOrderDetail(detail);
            if (!normalized.IdOrderDetail) {
              console.warn(`Order detail at index ${index} has no ID:`, detail);
            }
            return normalized;
          })
        : [];

      // Get the user email from the order object
      const userEmail =
        order.userId?.email || order.UserEmail || order.userEmail || "";

      const normalizedOrder: IOrder = {
        IdOrder: order._id || order.IdOrder || 0, // Use _id from MongoDB if available
        OrderDate:
          order.createdAt || order.OrderDate || new Date().toISOString(),
        PaymentMethod: order.paymentMethod || order.PaymentMethod || "Unknown",
        Total: order.total || order.Total || 0,
        UserEmail: userEmail,
        CartId: order.cartId || order.CartId || 0,
        OrderDetails: normalizedDetails,
      };

      return normalizedOrder;
    } catch (error) {
      console.error("Error normalizing order:", error, "Order data:", order);
      return this.getEmptyOrder();
    }
  }

  private normalizeOrderDetail(detail: any): IOrderDetail {
    if (!detail) {
      return this.getEmptyOrderDetail();
    }

    // Get the ID from the detail object
    const id = detail._id || detail.idOrderDetail || detail.IdOrderDetail || 0;
    const orderId = detail.orderId || detail.OrderId || 0;
    const recordId =
      detail.recordId || detail.RecordId || detail.productId?._id || 0;
    const amount = detail.quantity || detail.amount || detail.Amount || 0;
    const price = detail.price || detail.Price || 0;
    const total = detail.total || detail.Total || amount * price;

    // Get the record title from the detail object
    let recordTitle = "Unknown Record";

    // Check title in different possible locations
    if (detail.recordId?.title) {
      // If recordId has a title property (from populated record)
      recordTitle = detail.recordId.title;
    } else if (detail.recordId?.TitleRecord) {
      // If recordId has a TitleRecord property
      recordTitle = detail.recordId.TitleRecord;
    } else if (detail.productId?.title) {
      // If productId has a title property
      recordTitle = detail.productId.title;
    } else if (typeof detail.recordTitle === "string") {
      recordTitle = detail.recordTitle;
    } else if (typeof detail.RecordTitle === "string") {
      recordTitle = detail.RecordTitle;
    } else if (detail.title) {
      // Direct title property
      recordTitle = detail.title;
    } else if (detail.recordDetails?.title) {
      // Check in recordDetails
      recordTitle = detail.recordDetails.title;
    } else if (recordId) {
      recordTitle = `Producto ${recordId}`;
    }

    return {
      IdOrderDetail: id,
      OrderId: orderId,
      RecordId: recordId,
      RecordTitle: recordTitle,
      Amount: amount,
      Price: price,
      Total: total,
    };
  }

  private getEmptyOrder(): IOrder {
    return {
      IdOrder: 0,
      OrderDate: new Date().toISOString(),
      PaymentMethod: "",
      Total: 0,
      UserEmail: "",
      CartId: 0,
      OrderDetails: [],
    };
  }

  private getEmptyOrderDetail(): IOrderDetail {
    return {
      IdOrderDetail: 0,
      OrderId: 0,
      RecordId: 0,
      RecordTitle: "Unknown Record",
      Amount: 0,
      Price: 0,
      Total: 0,
    };
  }
}
