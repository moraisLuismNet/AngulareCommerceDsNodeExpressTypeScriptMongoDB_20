import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private stockUpdateSubject = new Subject<{
    recordId: number;
    newStock: number;
  }>();
  stockUpdate$ = this.stockUpdateSubject.asObservable();

  notifyStockUpdate(recordId: number, newStock: number | undefined | null) {
    if (typeof newStock !== 'number' || isNaN(newStock) || newStock < 0) {
      return;
    }
    this.stockUpdateSubject.next({ recordId, newStock });
  }
}
