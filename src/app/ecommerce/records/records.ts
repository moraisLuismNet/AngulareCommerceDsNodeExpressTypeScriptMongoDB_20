import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  afterNextRender,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  //environment
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// PrimeNG
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { TableModule } from "primeng/table";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { DialogModule } from "primeng/dialog";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { FileUploadModule } from "primeng/fileupload";
import { TooltipModule } from "primeng/tooltip";

// Services
import { IRecord } from "../ecommerce.interface";
import { RecordsService } from "../services/records";
import { GroupsService } from "../services/groups";
import { StockService } from "../services/stock";
import { CartService } from "../services/cart";
import { UserService } from "src/app/services/user";
import { MessageModule } from "primeng/message";

import { environment } from "src/environments/environment";

@Component({
  selector: "app-records",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    ConfirmDialogModule,
    FileUploadModule,
    TooltipModule,
    MessageModule,
  ],
  templateUrl: "./records.html",
  styleUrls: ["./records.css"],
  providers: [ConfirmationService, MessageService],
})
export class RecordsComponent implements OnInit {
  @ViewChild("form") form!: NgForm;
  @ViewChild("fileInput") fileInput!: ElementRef;
  @ViewChild("recordsTable") recordsTable!: ElementRef<HTMLTableElement>;
  visibleError = false;
  errorMessage = "";
  records: IRecord[] = [];
  filteredRecords: IRecord[] = [];
  visibleConfirm = false;
  imageRecord = "";
  visiblePhoto = false;
  photo = "";
  searchText: string = "";
  imageUrl: string = "";

  record: IRecord = {
    IdRecord: 0,
    TitleRecord: "",
    YearOfPublication: null,
    ImageRecord: null,
    Photo: null,
    PhotoName: null,
    Price: 0,
    stock: 0,
    Discontinued: false,
    GroupId: null,
    GroupName: "",
    NameGroup: "",
  };

  // Flag to track if a file has been selected
  fileSelected: boolean = false;

  groups: any[] = [];
  recordService: any;
  private resizeObserver!: ResizeObserver;
  private destroyRef = inject(DestroyRef);

  // Services injected using constructor
  constructor(
    private recordsService: RecordsService,
    private groupsService: GroupsService,
    private confirmationService: ConfirmationService,
    private stockService: StockService,
    private cartService: CartService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {
    // This will run after the next change detection cycle
    afterNextRender(() => {
      this.updateTableVisuals();
    });
  }

  ngOnInit(): void {
    this.getRecords();
    this.getGroups();

    // Initialize the form with default values
    this.resetForm();

    // Subscribe to stock updates
    this.stockService.stockUpdate$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ recordId, newStock }) => {
        const record = this.records.find((r) => r.IdRecord === recordId);
        if (record) {
          record.stock = newStock;
          // Update filtered records as well
          const filteredRecord = this.filteredRecords.find(
            (r) => r.IdRecord === recordId
          );
          if (filteredRecord) {
            filteredRecord.stock = newStock;
          }
        }
      });

    // Subscribe to cart updates
    this.cartService.cart$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cartItems) => {
        this.records.forEach((record) => {
          const cartItem = cartItems.find(
            (item) => item.IdRecord === record.IdRecord
          );
          record.inCart = !!cartItem;
          record.Amount = cartItem ? cartItem.Amount || 0 : 0;
        });
        this.filteredRecords = [...this.records];
      });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // Get the image URL from a record, handling both camelCase and PascalCase properties
  getImageUrl(record: any): string {
    // First try to get the image URL from the record
    const imageUrl = record.imageRecord || record.ImageRecord;

    // If no image URL, return a data URL for a simple placeholder
    if (!imageUrl) {
      return "https://imgur.com/neXme88.png";
    }

    // If the URL is already a full URL, return it as is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // If it's a relative path, prepend the API base URL
    return `${this.recordsService.urlAPI}${imageUrl}`;
  }

  // Handle image loading errors
  handleImageError(event: any, record: any): void {
    const recordId = record?._id || record?.IdRecord || "unknown";
    const imageUrl = event?.target?.src || "no source";

    console.warn(`Image load error for record ${recordId}:`, {
      error: event,
      attemptedUrl: imageUrl,
      record: {
        id: recordId,
        title: record?.TitleRecord || record?.title || "No title",
        imagePath:
          record?.ImageRecord || record?.imageRecord || "No image path",
      },
    });

    // Set a fallback image
    const fallbackImage = "https://i.imgur.com/neXme88.png"; // Direct link to imgur

    // Prevent infinite loop if fallback also fails
    if (event.target.src !== fallbackImage) {
      event.target.src = fallbackImage;
    } else {
      // If fallback also fails, set to blank to prevent continuous errors
      event.target.style.display = "none";
    }
  }

  private updateTableVisuals(): void {
    // Update any table visual elements
  }

  getRecords() {
    this.recordsService.getRecords().subscribe({
      next: (data: any) => {
        if (!data) {
          console.error("No data was received from the service");
          this.errorMessage = "No data was received from the service";
          this.visibleError = true;
          return;
        }

        const recordsArray = Array.isArray(data)
          ? data
          : Array.isArray(data?.$values)
          ? data.$values
          : Array.isArray(data?.data)
          ? data.data
          : [];

        // Get the groups to assign names
        this.groupsService.getGroups().subscribe({
          next: (groupsResponse: any) => {
            const groups = Array.isArray(groupsResponse)
              ? groupsResponse
              : Array.isArray(groupsResponse.$values)
              ? groupsResponse.$values
              : [];

            // Assign the group name to each record
            recordsArray.forEach((record: IRecord) => {
              const group = groups.find(
                (g: { idGroup: number | null }) => g.idGroup === record.GroupId
              );
              if (group) {
                record.GroupName = group.nameGroup;
              }
            });

            this.records = recordsArray;
            this.filteredRecords = [...this.records];
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error("Error getting groups:", err);
            this.records = recordsArray;
            this.filteredRecords = [...this.records];
            this.cdr.detectChanges();
          },
        });
      },
      error: (err: any) => {
        console.error("Error getting records:", err);
        this.visibleError = true;
        this.controlError(err);
        this.cdr.detectChanges();
      },
    });
  }

  filterRecords() {
    if (!this.searchText?.trim()) {
      this.filteredRecords = [...this.records];
      return;
    }

    const searchTerm = this.searchText.toLowerCase();
    this.filteredRecords = this.records.filter((record) => {
      return (
        record.TitleRecord?.toLowerCase().includes(searchTerm) ||
        record.GroupName?.toLowerCase().includes(searchTerm) ||
        record.YearOfPublication?.toString().includes(searchTerm)
      );
    });
  }

  onSearchChange() {
    this.filterRecords();
  }

  getGroups() {
    this.groupsService.getGroups().subscribe({
      next: (response: any) => {
        // Flexible handling of different response structures
        let groupsArray = [];

        if (Array.isArray(response)) {
          // The answer is a direct array
          groupsArray = response;
        } else if (Array.isArray(response.$values)) {
          // The response has property $values
          groupsArray = response.$values;
        } else if (Array.isArray(response.data)) {
          // The response has data property
          groupsArray = response.data;
        } else {
          console.warn("Unexpected API response structure:", response);
        }

        this.groups = groupsArray;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("Error loading groups:", err);
        this.visibleError = true;
        this.controlError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onChange(event: any) {
    const file = event.target.files;

    if (file && file.length > 0) {
      this.record.Photo = file[0];
      this.record.PhotoName = file[0].name;
      this.fileSelected = true;
    } else {
      this.fileSelected = false;
      this.record.Photo = null;
      this.record.PhotoName = null;
    }
  }

  onAceptar() {
    this.fileInput.nativeElement.value = "";
  }

  showImage(record: IRecord): void {
    // Toggle visibility if clicking the same record's image
    if (this.visiblePhoto && this.record?.IdRecord === record.IdRecord) {
      this.visiblePhoto = false;
      return;
    }

    // Set the current record
    this.record = { ...record };

    // Handle the image source safely - check both property names
    const imageUrl = record.imageRecord || record.ImageRecord;

    if (imageUrl) {
      let finalImageUrl = imageUrl.toString();

      // If it's a base64 string or a data URL
      if (finalImageUrl.startsWith("data:image")) {
        // Use as is
      }
      // If it's just a filename, construct the full URL
      else if (!finalImageUrl.startsWith("http")) {
        finalImageUrl = `${environment.urlAPI}uploads/${finalImageUrl}`;
      }
      // If it's already a full URL (like Imgur), add a timestamp to bypass cache
      else if (finalImageUrl.startsWith("http")) {
        finalImageUrl = `${finalImageUrl}?t=${new Date().getTime()}`;
      }

      this.photo = finalImageUrl;
    } else {
      // Set a default image if no image is available
      this.photo = "assets/images/no-image-available.png";
      const recordTitle = record.title || record.TitleRecord || "Unknown";
      console.warn("No image available for record:", recordTitle);
    }

    this.visiblePhoto = true;
  }

  // Helper method to handle save errors
  private handleSaveError(error: any): void {
    this.visibleError = true;

    let errorMessage = "An error occurred while saving the record";

    if (error.status === 400) {
      // Handle 400 Bad Request with validation errors
      if (error.error && typeof error.error === "object") {
        // If the error has specific validation messages
        const errorObj = error.error;
        errorMessage =
          "Validation error: " + Object.values(errorObj).flat().join(" ");
      } else if (error.error && typeof error.error === "string") {
        errorMessage = error.error;
      }
    } else if (error.status === 401) {
      errorMessage = "Authentication required. Please log in again.";
    } else if (error.status === 403) {
      errorMessage = "You do not have permission to perform this action.";
    } else if (error.status === 404) {
      errorMessage = "The requested resource was not found.";
    } else if (error.status >= 500) {
      errorMessage = "A server error occurred. Please try again later.";
    }

    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: errorMessage,
      life: 5000,
    });

    this.controlError(error);
  }

  save() {
    // Validate required fields
    if (!this.record.TitleRecord || this.record.TitleRecord.trim() === "") {
      this.visibleError = true;
      this.errorMessage = "Title is required";
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Title is required",
        life: 3000,
      });
      return;
    }

    // If imageUrl is provided, use it as the image source
    if (this.imageUrl && this.imageUrl.trim() !== "") {
      // Clear any existing Photo if we're using imageUrl
      this.record.Photo = null;
      this.record.PhotoName = null;
      // Set ImageRecord to the provided URL
      this.record.ImageRecord = this.imageUrl.trim();
      this.record.imageRecord = this.imageUrl.trim();
    }
    // If we have a photo file but no imageUrl, ensure ImageRecord is set to null
    else if (this.record.Photo) {
      this.record.ImageRecord = null;
      this.record.imageRecord = null;
    }
    // If neither photo nor imageUrl is provided, ensure both are null
    else {
      this.record.ImageRecord = null;
      this.record.imageRecord = null;
    }

    // Create a clean object with properties mapped to backend expectations
    const recordToSave: any = {
      // For existing records, include both _id and IdRecord
      ...(this.record._id && { _id: this.record._id }), // MongoDB _id
      ...(this.record.IdRecord &&
        this.record.IdRecord !== 0 && { IdRecord: this.record.IdRecord }), // Frontend ID

      // Map frontend properties to backend property names
      title: this.record.TitleRecord, // Use lowercase for backend compatibility
      TitleRecord: this.record.TitleRecord, // Keep original case too for frontend
      yearOfPublication: this.record.YearOfPublication,
      YearOfPublication: this.record.YearOfPublication,
      price: this.record.Price,
      Price: this.record.Price,
      stock: this.record.stock,
      Discontinued: this.record.Discontinued,
      NameGroup: this.record.NameGroup || this.record.GroupName,
      nameGroup: this.record.NameGroup || this.record.GroupName, // Add lowercase version
      GroupId: this.record.GroupId, // Let service handle the Group/GroupId mapping

      // Image/Photo handling - include all possible variations
      ...(this.record.ImageRecord && {
        ImageRecord: this.record.ImageRecord,
        imageRecord: this.record.ImageRecord, // Ensure both cases are covered
      }),
      ...(this.record.imageRecord && {
        imageRecord: this.record.imageRecord,
        ImageRecord: this.record.imageRecord, // Ensure both cases are covered
      }),
      ...(this.record.Photo && { Photo: this.record.Photo }),
      ...(this.record.PhotoName && { PhotoName: this.record.PhotoName }),
    };

    if (this.record.IdRecord === 0) {
      // Add new record
      this.recordsService.addRecord(recordToSave).subscribe({
        next: (data) => {
          this.visibleError = false;
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Record added successfully",
            life: 3000,
          });
          this.form.reset();
          this.cancelEdition();
          this.getRecords();
        },
        error: (err) => {
          console.error("Error adding record:", err);
          this.handleSaveError(err);
        },
      });
    } else {
      // Update existing record
      this.recordsService.updateRecord(recordToSave).subscribe({
        next: (updatedRecord: any) => {
          // console.log('Received updated record from server:', updatedRecord);

          this.visibleError = false;
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Record updated successfully",
            life: 3000,
          });

          // Get the response data (handle both direct response and nested data property)
          const responseData = updatedRecord.data || updatedRecord;

          // Force a complete update of the records list
          this.getRecords();

          // Close the edit form
          this.cancelEdition();

          // Force change detection
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error updating record:", err);
          this.handleSaveError(err);
        },
      });
    }
  }

  confirmDelete(record: IRecord) {
    // Use the title property with fallback to TitleRecord or a default value
    const recordTitle = record.title || record.TitleRecord || "this record";
    this.confirmationService.confirm({
      message: `Delete record ${recordTitle}?`,
      header: "Are you sure?",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Yes",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => this.deleteRecord(record.IdRecord),
    });
  }

  deleteRecord(id: number) {
    this.recordsService.deleteRecord(id).subscribe({
      next: (data: any) => {
        this.visibleError = false;
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Record deleted successfully",
          life: 3000,
        });
        this.getRecords();
      },
      error: (err: any) => {
        console.error("Error deleting record:", err);
        this.visibleError = true;

        let errorMessage = "An error occurred while deleting the record";

        if (err.status === 401) {
          errorMessage = "Authentication required. Please log in again.";
          // Optionally redirect to login
          // this.router.navigate(['/login']);
        } else if (err.status === 403) {
          errorMessage = "You do not have permission to delete this record";
        } else if (err.status === 404) {
          errorMessage = "Record not found or already deleted";
        } else if (err.response) {
          // Handle server response with error details
          if (err.response.message) {
            errorMessage = err.response.message;
          } else if (err.response.error) {
            errorMessage = err.response.error;
          }
        }

        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: errorMessage,
          life: 5000,
        });

        this.controlError(err);
        this.cdr.detectChanges();
      },
    });
  }

  edit(record: any) {
    // Map server properties to IRecord interface
    this.record = {
      // IDs
      _id: record._id || undefined, // MongoDB _id
      IdRecord: record.IdRecord || record._id || 0, // Use _id as fallback for IdRecord

      // Basic info
      TitleRecord: record.title || record.TitleRecord || "",
      YearOfPublication:
        record.yearOfPublication !== undefined
          ? record.yearOfPublication
          : record.YearOfPublication !== undefined
          ? record.YearOfPublication
          : null,
      Price:
        record.price !== undefined
          ? record.price
          : record.Price !== undefined
          ? record.Price
          : 0,
      stock:
        record.stock !== undefined
          ? record.stock
          : record.Stock !== undefined
          ? record.Stock
          : 0,
      Discontinued:
        record.discontinued !== undefined
          ? record.discontinued
          : record.Discontinued !== undefined
          ? record.Discontinued
          : false,

      // Group info
      GroupId: record.Group || record.GroupId || null,
      NameGroup: record.nameGroup || record.NameGroup || "",
      GroupName: record.nameGroup || record.GroupName || "",

      // Image/Photo handling
      ImageRecord: record.imageRecord || record.ImageRecord || null,
      imageRecord: record.imageRecord || record.ImageRecord || null, // Ensure both cases are handled
      Photo: null, // Reset photo file object
      PhotoName: record.imageRecord || record.PhotoName || "",
    };

    // Set the imageUrl for the form input
    this.imageUrl = record.imageRecord || record.ImageRecord || "";

    // Clear any previous file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
    this.fileSelected = false;

    // Set the group information if not already set
    if ((!this.record.GroupName || !this.record.GroupId) && this.groups) {
      const selectedGroup = this.groups.find(
        (g) =>
          g.IdGroup === this.record.GroupId || g._id === this.record.GroupId
      );
      if (selectedGroup) {
        this.record.GroupName =
          selectedGroup.NameGroup || selectedGroup.nameGroup || "";
        this.record.GroupId =
          selectedGroup.IdGroup || selectedGroup._id || null;
        this.record.NameGroup =
          selectedGroup.NameGroup || selectedGroup.nameGroup || "";
      }
    }

    // Scroll to form for better UX
    setTimeout(() => {
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  extractImageName(url: string): string {
    return url.split("/").pop() || "";
  }

  resetForm() {
    this.record = {
      IdRecord: 0,
      TitleRecord: "",
      YearOfPublication: null,
      ImageRecord: null,
      Photo: null,
      PhotoName: null,
      Price: 0,
      stock: 0,
      Discontinued: false, // Set to false by default when form is reset
      GroupId: null, // This will make the dropdown show 'Select a Group'
      GroupName: "",
      NameGroup: "",
    };

    // Reset the image URL input
    this.imageUrl = "";
    this.fileSelected = false;

    // Reset the form validation state
    if (this.form) {
      this.form.resetForm();
    }
  }

  cancelEdition() {
    this.resetForm();
  }

  controlError(err: any) {
    if (err.error && typeof err.error === "object" && err.error.message) {
      this.errorMessage = err.error.message;
    } else if (typeof err.error === "string") {
      this.errorMessage = err.error;
    } else {
      this.errorMessage = "An unexpected error has occurred";
    }
  }

  addToCart(record: IRecord): void {
    const userEmail = this.userService.email;
    if (!userEmail) return;

    this.cartService.addToCart(record).subscribe(
      (response) => {
        // Update UI locally
        record.inCart = true;
        record.Amount = (record.Amount || 0) + 1;
        this.filteredRecords = [...this.records];
      },
      (error) => {
        console.error("Error adding to cart:", error);
        // Revert local changes if it fails
        record.inCart = false;
        record.Amount = 0;
        this.filteredRecords = [...this.records];
      }
    );
  }

  removeFromCart(record: IRecord): void {
    const userEmail = this.userService.email;
    if (!userEmail || !record.inCart) return;

    this.cartService.removeFromCart(record).subscribe(
      (response) => {
        // Update UI locally
        record.Amount = Math.max(0, (record.Amount || 0) - 1);
        record.inCart = record.Amount > 0;
        this.filteredRecords = [...this.records];
      },
      (error) => {
        console.error("Error removing from cart:", error);
        // Revert local changes if it fails
        record.Amount = (record.Amount || 0) + 1;
        record.inCart = true;
        this.filteredRecords = [...this.records];
      }
    );
  }
}
