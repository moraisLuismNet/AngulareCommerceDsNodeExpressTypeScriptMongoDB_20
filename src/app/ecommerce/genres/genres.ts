import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  afterNextRender,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { Subject } from "rxjs";

// PrimeNG
import { ConfirmationService, MessageService } from "primeng/api";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { DialogModule } from "primeng/dialog";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { TooltipModule } from "primeng/tooltip";
import { MessageModule } from "primeng/message";

// Services & Interfaces
import { IGenre } from "../ecommerce.interface";
import { GenresService } from "../services/genres";

@Component({
  selector: "app-genres",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
    MessageModule,
  ],
  templateUrl: "./genres.html",
  providers: [ConfirmationService, MessageService],
})
export class GenresComponent implements OnInit {
  @ViewChild("genresTable") genresTable!: ElementRef<HTMLTableElement>;
  private resizeObserver!: ResizeObserver;
  private destroy$ = new Subject<void>();

  // Services injected using inject()
  private genresService = inject(GenresService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // After the initial render
    afterNextRender(() => {
      this.setupTableResizeObserver();
    });
  }
  @ViewChild("form") form!: NgForm;
  visibleError = false;
  errorMessage = "";
  genres: IGenre[] = [];
  filteredGenres: IGenre[] = [];
  visibleConfirm = false;
  searchTerm: string = "";

  genre: IGenre = {
    IdMusicGenre: 0,
    NameMusicGenre: "",
  };

  ngOnInit(): void {
    this.getGenres();
  }

  getGenres() {
    this.genresService.getGenres().subscribe({
      next: (response: any) => {
        this.visibleError = false;

        // Check the response format
        if (
          response &&
          response.success !== undefined &&
          Array.isArray(response.data)
        ) {
          // Format: {success: boolean, data: IGenre[]}
          this.genres = response.data;
        } else if (Array.isArray(response)) {
          // Format: IGenre[]
          this.genres = response;
        } else if (response && Array.isArray(response.$values)) {
          // Format: {$values: IGenre[]}
          this.genres = response.$values;
        } else {
          console.warn("Unexpected response format:", response);
          this.genres = [];
        }

        this.filteredGenres = [...this.genres];

        // Force change detection
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error("Error getting genres:", err);
        this.visibleError = true;
        this.controlError(err);
        this.cdr.markForCheck();
      },
    });
  }
  save() {
    if (!this.genre.NameMusicGenre || this.genre.NameMusicGenre.trim() === "") {
      this.visibleError = true;
      this.errorMessage = "Genre name is required";
      return;
    }

    if (this.genre.IdMusicGenre === 0) {
      // Add new genre
      this.genresService.addGenre(this.genre).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.form.reset();
          this.getGenres();
          this.cancelEdition();
        },
        error: (err) => {
          console.error("Error adding genre:", err);
          this.visibleError = true;
          this.controlError(err);
        },
      });
    } else {
      // Update existing genre
      this.genresService.updateGenre(this.genre).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.cancelEdition();
          this.form.reset();
          this.getGenres();
        },
        error: (err) => {
          this.visibleError = true;
          this.controlError(err);
        },
      });
    }
  }

  edit(genre: IGenre) {
    this.genre = { ...genre };
  }

  cancelEdition() {
    this.genre = {
      IdMusicGenre: 0,
      NameMusicGenre: "",
    };
  }

  confirmDelete(genre: IGenre) {
    if (!genre.IdMusicGenre) {
      this.visibleError = true;
      this.errorMessage = "Cannot delete: Invalid genre ID";
      return;
    }

    this.confirmationService.confirm({
      message: `Delete the genre ${genre.NameMusicGenre}?`,
      header: "Are you sure?",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Yes",
      rejectLabel: "No",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => this.deleteGenre(genre.IdMusicGenre!),
    });
  }

  deleteGenre(id: number) {
    if (!id || id <= 0) {
      this.visibleError = true;
      this.errorMessage = "Cannot delete: Invalid genre ID";
      return;
    }

    this.genresService.deleteGenre(id).subscribe({
      next: (data) => {
        this.visibleError = false;
        this.form.reset({
          name: "",
        });
        this.getGenres();
      },
      error: (err) => {
        this.visibleError = true;
        if (err.message === "Invalid genre ID") {
          this.errorMessage = "Cannot delete: Invalid genre ID";
        } else if (err.status === 404) {
          this.errorMessage = "Genre not found or already deleted";
        } else if (err.status === 400) {
          this.errorMessage = "Invalid request. Please try again.";
        } else {
          this.errorMessage = "An error occurred while deleting the genre";
        }
        console.error("Delete genre error:", err);
      },
    });
  }

  private setupTableResizeObserver(): void {
    if (!this.genresTable) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        console.log("The gender table has been resized:", entry.contentRect);
        this.adjustTableColumns();
      });
    });

    this.resizeObserver.observe(this.genresTable.nativeElement);
  }

  private adjustTableColumns(): void {
    if (!this.genresTable) return;

    const table = this.genresTable.nativeElement;
    const containerWidth = table.offsetWidth;
    const headers = table.querySelectorAll("th");

    // Adjust column widths based on container width
    if (containerWidth < 600) {
      // Mobile view
      headers.forEach((header, index) => {
        if (index > 0) {
          header.style.display = "none";
        } else {
          header.style.display = "table-cell";
          header.style.width = "100%";
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

  filterGenres() {
    const term = this.searchTerm.toLowerCase();
    this.filteredGenres = this.genres.filter((genre) =>
      genre.NameMusicGenre.toLowerCase().includes(term)
    );
  }
  controlError(err: any) {
    if (err.error && typeof err.error === "object" && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === "string") {
      // If `err.error` is a string, it is assumed to be the error message
      this.errorMessage = err.error;
    } else {
      // Handles the case where no useful error message is received
      this.errorMessage = "An unexpected error has occurred";
    }
  }

  ngOnDestroy(): void {
    // Clear the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}
