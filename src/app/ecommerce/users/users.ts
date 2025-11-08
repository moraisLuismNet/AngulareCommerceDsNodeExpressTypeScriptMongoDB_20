import {
  Component,
  OnInit,
  afterNextRender,
  ElementRef,
  ViewChild,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// PrimeNG
import { TableModule } from "primeng/table";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { TooltipModule } from "primeng/tooltip";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { ConfirmationService, MessageService } from "primeng/api";

// Services & Interfaces
import { UsersService } from "../services/users";
import { IUser } from "../ecommerce.interface";

@Component({
  selector: "app-users",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    DialogModule,
  ],
  templateUrl: "./users.html",
  providers: [ConfirmationService, MessageService],
})
export class UsersComponent implements OnInit {
  users: IUser[] = [];
  filteredUsers: IUser[] = [];
  loading = true;
  searchText = "";
  errorMessage = "";
  visibleError = false;

  // Inject DestroyRef
  private destroyRef = inject(DestroyRef);

  @ViewChild("usersTable") usersTable!: ElementRef<HTMLTableElement>;
  private resizeObserver!: ResizeObserver;

  // Services injected using inject()
  private usersService = inject(UsersService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // After the initial render
    afterNextRender(() => {
      this.initializeUsersTable();
      this.setupTableResizeObserver();
      this.updateTableVisuals();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    // Clear the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.filteredUsers = [...this.users];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error("Error loading users:", error);
          this.errorMessage = this.getErrorMessage(error);
          this.visibleError = true;
          this.loading = false;
          this.cdr.detectChanges();
          this.users = [];
          this.filteredUsers = [];
          this.loading = false;
        },
      });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return "You don't have permission to view users. Please log in as an administrator.";
    }
    return "Error loading users. Please try again..";
  }

  confirmDelete(email: string): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the user "${email}"?`,
      header: "Delete User",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      rejectButtonStyleClass: "p-button-secondary",
      acceptIcon: "pi pi-check",
      acceptLabel: "Yes",
      rejectLabel: "No",
      accept: () => {
        this.deleteUser(email);
      },
    });
  }

  deleteUser(email: string): void {
    this.usersService
      .deleteUser(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (success) => {
          if (success) {
            this.messageService.add({
              severity: "success",
              summary: "Success",
              detail: "User successfully deleted",
            });
            this.loadUsers();
          } else {
            console.warn("User deletion failed - service returned false");
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: "Failed to delete user. Please try again.",
            });
          }
        },
        error: (error) => {
          console.error("Error in deleteUser subscription:", {
            error,
            errorMessage: error.message,
            status: error.status,
            url: error.url,
            headers: error.headers,
          });
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: error.error?.message || "Error deleting user",
          });
        },
      });
  }

  private initializeUsersTable(): void {
    // Configure custom events for table rows
    const userRows = document.querySelectorAll(".user-row");
    userRows.forEach((row) => {
      // Add hover effect
      row.addEventListener("mouseenter", () => {
        row.classList.add("hovered");
      });
      row.addEventListener("mouseleave", () => {
        row.classList.remove("hovered");
      });

      // Add row selection handler
      row.addEventListener("click", (event) => {
        // Avoid selection when clicking buttons
        if (!(event.target as HTMLElement).closest("button")) {
          row.classList.toggle("selected");
        }
      });
    });
  }

  private setupTableResizeObserver(): void {
    if (!this.usersTable) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        console.log("The users table has been resized:", entry.contentRect);
        this.adjustTableColumns();
      });
    });

    this.resizeObserver.observe(this.usersTable.nativeElement);
  }

  private adjustTableColumns(): void {
    if (!this.usersTable) return;

    const table = this.usersTable.nativeElement;
    const containerWidth = table.offsetWidth;
    const headers = table.querySelectorAll("th");

    // Adjust column widths based on container width
    if (containerWidth < 768) {
      // Mobile view
      headers.forEach((header, index) => {
        if (index > 1) {
          header.style.display = "none";
        } else {
          header.style.display = "table-cell";
          header.style.width = index === 0 ? "60%" : "40%";
        }
      });
    } else {
      // Desktop view
      headers.forEach((header) => {
        header.style.display = "table-cell";
        header.style.width = ""; // Restore default width
      });
    }
  }

  private updateTableVisuals(): void {
    // Update styles based on state
    const userRows = document.querySelectorAll(".user-row");

    userRows.forEach((row, index) => {
      // Toggle row styles
      if (index % 2 === 0) {
        row.classList.add("even");
        row.classList.remove("odd");
      } else {
        row.classList.add("odd");
        row.classList.remove("even");
      }

      // Highlight inactive users
      const statusCell = row.querySelector(".user-status");
      if (statusCell) {
        if (statusCell.textContent?.toLowerCase().includes("inactivo")) {
          row.classList.add("inactive-user");
        } else {
          row.classList.remove("inactive-user");
        }
      }
    });
  }

  onSearchChange(): void {
    if (!this.searchText) {
      this.filteredUsers = [...this.users];
      return;
    }
    const searchTerm = this.searchText.toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.Email.toLowerCase().includes(searchTerm) ||
        (user.Name && user.Name.toLowerCase().includes(searchTerm)) ||
        (user.Role && user.Role.toLowerCase().includes(searchTerm))
    );
  }
}
