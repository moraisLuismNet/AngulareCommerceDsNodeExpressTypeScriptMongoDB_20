import {
  Component,
  OnInit,
  OnDestroy,
  afterNextRender,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Interfaces
import { OrderService } from '../services/OrderService';
import { IOrder } from '../EcommerceInterface';

@Component({
  selector: 'app-admin-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
  ],
  templateUrl: './AdminOrdersComponent.html',
  styleUrls: ['./AdminOrdersComponent.css'],
  providers: [MessageService],
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  orders: IOrder[] = [];
  filteredOrders: IOrder[] = [];
  loading = true;
  searchText: string = '';
  expandedOrderId: number | null = null;
  private destroy$ = new Subject<void>();
  @ViewChild('ordersTable') ordersTable!: ElementRef<HTMLTableElement>;
  private orderService = inject(OrderService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // After the initial render
    afterNextRender(() => {});
  }

  ngOnInit(): void {
    this.loadAllOrders();
  }

  loadAllOrders(): void {
    this.loading = true;

    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        
        if (!orders) {
          console.error('No orders data received from service');
          return;
        }
        
        const rawOrders = JSON.parse(JSON.stringify(orders || []));

        // Force change detection with new arrays
        this.orders = Array.isArray(orders) ? [...orders] : [];
        this.filteredOrders = [...this.orders];

        this.loading = false;

        // Force change detection manually
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'The orders could not be loaded. Please try again.',
        });
        this.orders = [];
        this.filteredOrders = [];
        this.loading = false;
      },
    });
  }

  toggleOrderDetails(orderId: number): void {
    // Create a new reference to trigger change detection
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderId === orderId;
  }

  onSearchChange() {
    this.filterOrders(this.searchText);
  }

  private filterOrders(searchText: string): void {
    if (!searchText) {
      // Create new array reference to trigger change detection
      this.filteredOrders = [...this.orders];
      return;
    }

    const searchLower = searchText.toLowerCase();
    this.filteredOrders = this.orders.filter(
      (order) =>
        order.UserEmail.toLowerCase().includes(searchLower) ||
        order.IdOrder.toString().includes(searchLower) ||
        order.PaymentMethod.toLowerCase().includes(searchLower) ||
        (order.OrderDate &&
          new Date(order.OrderDate).toLocaleDateString().includes(searchLower))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
