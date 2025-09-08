import { Component, OnInit, OnDestroy, afterNextRender, ElementRef, ViewChild, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Services & Interfaces
import { OrderService } from '../services/OrderService';
import { UserService } from 'src/app/services/UserService';
import { IOrder } from '../EcommerceInterface';

@Component({
    selector: 'app-orders',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        InputTextModule,
        ButtonModule,
        TooltipModule,
        ProgressSpinnerModule
    ],
    templateUrl: './OrdersComponent.html',
    providers: [MessageService]
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: IOrder[] = [];
  filteredOrders: IOrder[] = [];
  loading = true;
  searchText: string = '';
  expandedOrderId: number | null = null;
  
  @ViewChild('ordersTable') ordersTable!: ElementRef<HTMLTableElement>;
  private resizeObserver!: ResizeObserver;
  private destroy$ = new Subject<void>();
  // Services injected using inject()
  private orderService = inject(OrderService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Execute once after initial rendering
    afterNextRender(() => {
      this.initializeOrdersTable();
      this.setupTableResizeObserver();
    });

    // Setup afterNextRender for visual updates
    afterNextRender(() => {
      this.updateTableVisuals();
    });
  }

  ngOnInit(): void {
    this.userService.emailUser$.subscribe((email) => {
      if (email) {
        this.loadOrders(email);
      }
    });
  }

  loadOrders(email: string): void {
    this.loading = true;
    this.cdr.detectChanges();
    
    this.orderService.getOrdersByUserEmail(email).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.filteredOrders = [...orders];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.orders = [];
        this.filteredOrders = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    // Clear the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleOrderDetails(orderId: number): void {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderId === orderId;
  }

  filterOrders() {
    this.filteredOrders = this.orders.filter((order) =>
      order.OrderDate.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  private initializeOrdersTable(): void {
    // Configure custom events for table rows
    const orderRows = document.querySelectorAll('.order-row');
    orderRows.forEach(row => {
      // Add hover effect
      row.addEventListener('mouseenter', () => {
        row.classList.add('hovered');
      });
      row.addEventListener('mouseleave', () => {
        row.classList.remove('hovered');
      });
      
      // Add row click handler
      row.addEventListener('click', (event) => {
        // Avoid selection when clicking buttons or links
        if (!(event.target as HTMLElement).closest('button') && 
            !(event.target as HTMLElement).closest('a')) {
          const orderId = row.getAttribute('data-order-id');
          if (orderId) {
            this.toggleOrderDetails(Number(orderId));
          }
        }
      });
    });
  }

  private setupTableResizeObserver(): void {
    if (!this.ordersTable) return;
    
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.adjustTableColumns();
      });
    });
    
    this.resizeObserver.observe(this.ordersTable.nativeElement);
  }

  private adjustTableColumns(): void {
    if (!this.ordersTable) return;
    
    const table = this.ordersTable.nativeElement;
    const containerWidth = table.offsetWidth;
    const headers = table.querySelectorAll('th');
    
    // Adjust column widths based on container width
    if (containerWidth < 768) {
      // Mobile view
      headers.forEach((header, index) => {
        if (index > 2) {
          header.style.display = 'none';
        } else {
          header.style.display = 'table-cell';
          header.style.width = index === 0 ? '40%' : '30%';
        }
      });
    } else {
      // Desktop view
      headers.forEach(header => {
        header.style.display = 'table-cell';
        header.style.width = ''; // Restore default width
      });
    }
  }

  private updateTableVisuals(): void {
    // Update styles based on state
    const orderRows = document.querySelectorAll('.order-row');
    
    orderRows.forEach((row, index) => {
      // Alternate row styles
      if (index % 2 === 0) {
        row.classList.add('even');
        row.classList.remove('odd');
      } else {
        row.classList.add('odd');
        row.classList.remove('even');
      }
      
      // Highlight recent orders (last 24 hours)
      const dateCell = row.querySelector('.order-date');
      if (dateCell && dateCell.textContent) {
        const orderDate = new Date(dateCell.textContent);
        const now = new Date();
        const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          row.classList.add('recent-order');
        } else {
          row.classList.remove('recent-order');
        }
      }
    });
  }
  
  onSearchChange() {
    this.filterOrders();
  }
}
