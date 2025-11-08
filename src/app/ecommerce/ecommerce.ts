import { Component, OnInit, OnDestroy, afterNextRender, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-ecommerce',
    imports: [
        CommonModule,
        RouterOutlet
    ],
    templateUrl: './ecommerce.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [
        `
    /* Container styles */
    .main-content {
      min-height: calc(100vh - 120px); /* Adjust according to the size of your header/footer */
      padding: 20px;
      transition: all 0.3s ease;
    }

    /* Soft loading effect */
    .fade-in {
      animation: fadeIn 0.5s ease-in;
    }

    /* Fade-in animation */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Responsive styles */
    @media (max-width: 768px) {
      .main-content {
        padding: 10px;
      }
    }
    `
    ]
})
export class EcommerceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private resizeObserver!: ResizeObserver;

  private elementRef = inject(ElementRef);

  constructor() {
    // After the initial render
    afterNextRender(() => {
      this.initializeApp();
      this.setupResizeObserver();
      this.checkViewportSize();
      this.setupGlobalEventListeners();
    });
  }

  ngOnInit(): void {
  }

  private initializeApp(): void {
    // Add fade-in class
    const mainContent = this.elementRef.nativeElement.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.add('fade-in');
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        this.handleResponsiveLayout(entry.contentRect.width);
      });
    });

    // Observe changes in the root element
    if (this.elementRef?.nativeElement) {
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  private handleResponsiveLayout(width: number): void {
    const body = document.body;

    // Add/remove classes based on screen size
    if (width < 768) {
      body.classList.add('mobile-view');
      body.classList.remove('tablet-view', 'desktop-view');
    } else if (width < 1024) {
      body.classList.add('tablet-view');
      body.classList.remove('mobile-view', 'desktop-view');
    } else {
      body.classList.add('desktop-view');
      body.classList.remove('mobile-view', 'tablet-view');
    }
  }

  private checkViewportSize(): void {
    if (typeof window !== 'undefined') {
      this.handleResponsiveLayout(window.innerWidth);
    }
  }

  private setupGlobalEventListeners(): void {
    // Listen for changes in the connection status
    if (typeof window !== 'undefined' && window.navigator) {
      window.addEventListener('online', () => this.handleOnlineStatusChange(true));
      window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
    }
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    console.log(`Connection status: ${isOnline ? 'Online' : 'Offline'}`);
    // Implement logic to handle offline state
  }

  ngOnDestroy(): void {
    // Clean up the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleOnlineStatusChange(true));
      window.removeEventListener('offline', () => this.handleOnlineStatusChange(false));
    }
  }
}

