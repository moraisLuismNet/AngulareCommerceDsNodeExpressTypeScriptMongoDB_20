import {
  Component,
  OnInit,
  afterNextRender,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { Router, NavigationEnd, RouterLink } from "@angular/router";
import { AuthGuard } from "../../guards/auth-guard";
import { FormsModule } from "@angular/forms";
import { UserService } from "src/app/services/user";
import { CartService } from "src/app/ecommerce/services/cart";
import { of } from "rxjs";
import { filter, switchMap, tap } from "rxjs/operators";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";

@Component({
  selector: "app-navbar",
  imports: [CommonModule, RouterLink, FormsModule, ButtonModule, TooltipModule],
  templateUrl: "./navbar.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit {
  emailUser: string | null = null;
  role: string | null = null;
  cartItemsCount: number = 0;
  cartTotal: number = 0;
  currentRoute: string = "";
  cartEnabled: boolean = true;
  private readonly destroyRef = inject(DestroyRef);

  // Services injected using inject()
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly authGuard = inject(AuthGuard);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Initialize the current route
    this.currentRoute = this.router.url;
    // Setup afterNextRender for navbar style updates
    afterNextRender(() => {
      this.updateNavbarStyles();
    });
  }

  ngOnInit(): void {
    // Initialize from session storage if available
    const userData = sessionStorage.getItem("user");
    const userRole = sessionStorage.getItem("userRole");

    // Subscription to user email
    this.userService.email$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((email) => {
          this.emailUser = email;
          this.cdr.markForCheck();
        }),
        switchMap((email) => {
          if (!email) {
            this.cartItemsCount = 0;
            this.cartTotal = 0;
            return of(null);
          }

          // Skip cart operations for admin users
          if (this.isAdmin()) {
            this.cartItemsCount = 0;
            this.cartTotal = 0;
            this.cartEnabled = false;
            return of(null);
          }

          // For non-admin users, check cart status and sync
          return this.cartService.getCartStatus(email).pipe(
            tap((status: { enabled: boolean }) => {
              this.cartEnabled = status.enabled;
              this.cdr.markForCheck();
              if (status.enabled) {
                this.cartService.syncCartWithBackend(email);
              } else {
                this.cartService.resetCart();
              }
            })
          );
        })
      )
      .subscribe();

    // Subscription to user role changes
    this.userService.role$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.role = role;
        // Force update the view
        this.cdr.detectChanges();
      });

    // Subscription to cart item count
    this.cartService.cartItemCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((count) => {
        this.cartItemsCount = count;
        this.cdr.markForCheck();
      });

    // Subscription to cart total
    this.cartService.cartTotal$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((total) => {
        this.cartTotal = total;
        this.cdr.markForCheck();
      });

    // Subscription to router events
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: any) => {
        this.currentRoute = event.url;
        this.cdr.detectChanges(); // Trigger change detection
      });

    // Initial route check
    this.currentRoute = this.router.url;
    this.cdr.detectChanges();
  }

  isAdmin(): boolean {
    // Check the local role first
    if (this.role) {
      const isAdmin = this.role.toLowerCase() === "admin";
      return isAdmin;
    }

    // Fall back to UserService's isAdmin
    const userServiceIsAdmin = this.userService.isAdmin();
    const userServiceRole = this.userService.getRole();

    return userServiceIsAdmin;
  }

  isListGroupsPage(): boolean {
    return (
      this.currentRoute.includes("/listgroups") || this.currentRoute === "/"
    );
  }

  isOrdersPage(): boolean {
    const isOrdersPage =
      this.currentRoute.includes("/admin-orders") ||
      this.currentRoute.includes("/orders");
    return isOrdersPage;
  }

  isGenresPage(): boolean {
    return (
      this.currentRoute.includes("/genres") || this.currentRoute === "/genres"
    );
  }

  isGroupsPage(): boolean {
    return (
      this.currentRoute.includes("/groups") || this.currentRoute === "/groups"
    );
  }

  isRecordsPage(): boolean {
    return (
      this.currentRoute.includes("/records") || this.currentRoute === "/records"
    );
  }

  isCartsPage(): boolean {
    return (
      this.currentRoute.includes("/carts") || this.currentRoute === "/carts"
    );
  }

  isUsersPage(): boolean {
    return (
      this.currentRoute.includes("/users") || this.currentRoute === "/users"
    );
  }

  logout(): void {
    // Clear all session storage
    sessionStorage.clear();

    // Clear user data from the service
    this.userService.logout();

    // Reset local component state
    this.emailUser = null;
    this.role = null;
    this.cartItemsCount = 0;
    this.cartTotal = 0;

    // Navigate to login
    this.router.navigate(["/login"]);
  }

  private updateNavbarStyles(): void {
    // Update classes based on the current route
    const homeLink = document.querySelector('.nav-link[routerLink="/"]');
    if (homeLink) {
      if (this.currentRoute === "/") {
        homeLink.classList.add("active");
      } else {
        homeLink.classList.remove("active");
      }
    }
  }

  isLoginPage(): boolean {
    return this.currentRoute.includes("/login");
  }
}
