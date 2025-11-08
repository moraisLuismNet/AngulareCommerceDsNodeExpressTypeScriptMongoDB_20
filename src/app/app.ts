import {
  Component,
  OnInit,
  OnDestroy,
  afterNextRender,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Router, NavigationEnd, RouterModule } from "@angular/router";
import { filter, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

// Components
import { NavbarComponent } from "./shared/navbar/navbar";

@Component({
  selector: "app-root",
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: "./app.html",
})
export class AppComponent implements OnInit, OnDestroy {
  title = "AngulareCommerceDs";
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Runs once after initial rendering
    afterNextRender(() => {
      this.initializeApp();
      this.setupGlobalEventListeners();
      this.checkViewportSize();
      this.updateAppState();
    });
  }

  ngOnInit(): void {
    // Subscription to navigation events
    this.setupRouterEvents();
  }

  private initializeApp(): void {
    // Initial configurations that require access to the DOM
    if (this.isBrowser) {
      // Add class to body for global styles
      document.body.classList.add("app-loaded");

      // Check user preferences
      this.checkUserPreferences();
    }
  }

  private setupGlobalEventListeners(): void {
    if (!this.isBrowser) return;

    // Listen for changes in your internet connection
    window.addEventListener("online", () =>
      this.handleOnlineStatusChange(true)
    );
    window.addEventListener("offline", () =>
      this.handleOnlineStatusChange(false)
    );

    // Listen to changes in window size
    window.addEventListener("resize", this.handleWindowResize.bind(this));

    // Listen for global keyboard events
    window.addEventListener("keydown", this.handleGlobalKeyEvents.bind(this));
  }

  private setupRouterEvents(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {});
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    console.log(`Connection status: ${isOnline ? "Online" : "Offline"}`);
  }

  private handleWindowResize(): void {
    this.checkViewportSize();
  }

  private handleGlobalKeyEvents(event: KeyboardEvent): void {
    // Ctrl+Shift+D for debug mode
    if (event.ctrlKey && event.shiftKey && event.key === "D") {
      console.debug("Debug mode activated");
      document.body.classList.toggle("debug-mode");
    }
  }

  private checkViewportSize(): void {
    if (!this.isBrowser) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update custom CSS variables
    document.documentElement.style.setProperty(
      "--viewport-width",
      `${width}px`
    );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${height}px`
    );

    // Update responsive classes
    this.updateResponsiveClasses(width);
  }

  private updateResponsiveClasses(width: number): void {
    const body = document.body;

    // Clean up existing classes
    body.classList.remove("mobile-view", "tablet-view", "desktop-view");

    // Add class according to screen size
    if (width < 768) {
      body.classList.add("mobile-view");
    } else if (width < 1024) {
      body.classList.add("tablet-view");
    } else {
      body.classList.add("desktop-view");
    }
  }

  private checkUserPreferences(): void {
    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
      document.body.classList.add("dark-mode");
    }
  }

  private updateAppState(): void {}

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up event listeners
    if (this.isBrowser) {
      window.removeEventListener("online", () =>
        this.handleOnlineStatusChange(true)
      );
      window.removeEventListener("offline", () =>
        this.handleOnlineStatusChange(false)
      );
      window.removeEventListener("resize", this.handleWindowResize.bind(this));
      window.removeEventListener(
        "keydown",
        this.handleGlobalKeyEvents.bind(this)
      );
    }
  }
}
