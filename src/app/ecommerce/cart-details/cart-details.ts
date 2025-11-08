import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Subject, of, forkJoin, throwError } from "rxjs";
import { takeUntil, filter, map, catchError, switchMap } from "rxjs/operators";

// PrimeNG
import { ButtonModule } from "primeng/button";
import { InputNumberModule } from "primeng/inputnumber";
import { TableModule } from "primeng/table";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { MessageModule } from "primeng/message";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { ConfirmationService, MessageService } from "primeng/api";

// Services & Interfaces
import {
  ICartDetail,
  IRecord,
  IGroup,
  GroupResponse,
  ExtendedCartDetail,
} from "../ecommerce.interface";
import { UserService } from "src/app/services/user";
import { CartDetailService } from "../services/cart-detail";
import { CartService } from "src/app/ecommerce/services/cart";
import { OrderService } from "../services/order";
import { GroupsService } from "../services/groups";
import { RecordsService } from "../services/records";

@Component({
  selector: "app-cart-details",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    TableModule,
    ProgressSpinnerModule,
    MessageModule,
    ConfirmDialogModule,
    DialogModule,
  ],
  templateUrl: "./cart-details.html",
  styleUrls: ["./cart-details.css"],
  providers: [ConfirmationService, MessageService],
})
export class CartDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("cartContainer") cartContainer!: ElementRef;

  cartDetails: ExtendedCartDetail[] = [];
  filteredCartDetails: ExtendedCartDetail[] = [];
  emailUser: string | null = "";
  isAddingToCart = false;
  private readonly destroy$ = new Subject<void>();
  currentViewedEmail: string = "";
  isViewingAsAdmin: boolean = false;
  isCreatingOrder = false;
  alertMessage: string = "";
  alertType: "success" | "error" | null = null;
  loading = false;
  visibleError = false;
  errorMessage = "";

  // State for scrolling
  private lastScrollPosition: number = 0;

  private readonly cdr = inject(ChangeDetectorRef);
  private handleScrollBound: (event: Event) => void;

  constructor(
    private readonly cartDetailService: CartDetailService,
    private readonly route: ActivatedRoute,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
    private readonly groupsService: GroupsService,
    private readonly recordsService: RecordsService
  ) {
    // Bind the handleScroll method to maintain the correct 'this' context
    this.handleScrollBound = this.handleScroll.bind(this);
  }

  ngAfterViewInit(): void {
    // Initialize after the view is initialized
  }

  ngOnInit(): void {
    // Initialize scroll tracking
    this.initializeScrollTracking();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const viewingUserEmail = params["viewingUserEmail"];

        if (viewingUserEmail && this.userService.isAdmin()) {
          // Admin
          this.isViewingAsAdmin =
            viewingUserEmail && this.userService.isAdmin();
          this.currentViewedEmail = viewingUserEmail;
          this.isViewingAsAdmin = true;
          this.loadCartDetails(viewingUserEmail);
        } else {
          // User viewing their own cart
          this.userService.email$
            .pipe(
              takeUntil(this.destroy$),
              filter((email): email is string => !!email)
            )
            .subscribe((email) => {
              this.currentViewedEmail = email;
              this.isViewingAsAdmin = false;
              this.loadCartDetails(email);
            });
        }
      });
  }

  private loadCartDetails(email: string): void {
    this.loading = true;

    forkJoin({
      groups: this.groupsService.getGroups().pipe(catchError(() => of([]))),
      cart: this.cartService.getCart(email).pipe(
        catchError((error) => {
          console.error("Error loading cart:", error);
          return of(null);
        })
      ),
    })
      .pipe(
        switchMap(({ groups, cart }) => {
          // Handle both 'items' and 'CartDetails' properties
          const cartItems = Array.isArray(cart?.items)
            ? cart.items
            : Array.isArray(cart?.CartDetails)
            ? cart.CartDetails
            : [];

          if (cartItems.length === 0) {
            return of({ groups, cart, completeRecordDetails: [] });
          }

          // Map through cart items and fetch record details
          const recordDetailObservables = cartItems.map((item: any) => {
            // Handle both 'recordId' and 'RecordId' properties
            const recordId =
              item.recordId ||
              item.RecordId ||
              (item.record ? item.record.id || item.record.Id : null);

            if (!recordId) {
              console.warn("Cart item missing record ID:", item);
              return of(null);
            }

            return this.recordsService.getRecordById(recordId).pipe(
              catchError((err) => {
                console.error(`Error loading record ${recordId}:`, err);
                return of(null);
              })
            );
          });

          return forkJoin(recordDetailObservables).pipe(
            map((completeRecordDetails) => ({
              groups,
              cart: { ...cart, items: cartItems }, // Ensure items are included
              completeRecordDetails: completeRecordDetails.filter(Boolean), // Remove nulls
            }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ groups, cart, completeRecordDetails }) => {
          // Handle both 'items' and 'CartDetails' properties
          const cartItems = Array.isArray(cart?.items)
            ? cart.items
            : Array.isArray(cart?.CartDetails)
            ? cart.CartDetails
            : [];

          if (!cart || cartItems.length === 0) {
            this.cartDetails = [];
            this.filteredCartDetails = [];
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // Map the cart items to the ExtendedCartDetail format
          this.cartDetails = cartItems.map((item: any) => {
            // Ensure we're using the data directly from the API
            const recordDetails = item.recordDetails || item.record || {};

            const quantity = item.amount || 1;
            const price = item.price || 0;
            const title = recordDetails.title || "Título no disponible";

            // Assign group names based on available data
            let groupName = "Group unknown";

            // Use the recordId to determine the group
            const recordId = item.recordId || "";

            // Get the group name from recordDetails
            // First try to get it from the recordDetails of the cart
            // If not, try to get it from recordDetails.recordDetails (for compatibility with old data)
            groupName =
              recordDetails?.nameGroup ||
              recordDetails?.GroupName ||
              recordDetails?.recordDetails?.nameGroup ||
              recordDetails?.recordDetails?.GroupName ||
              "Group unknown";

            const image = recordDetails.image || "";
            const stock = recordDetails.stock || 0;
            const total = quantity * price;

            // Create the object with the structure expected by the template
            const mappedItem: ExtendedCartDetail = {
              // Properties of the original item without the ones we are going to overwrite
              ...Object.keys(item)
                .filter(
                  (key) =>
                    ![
                      "groupName",
                      "GroupName",
                      "RecordArtist",
                      "RecordGenre",
                    ].includes(key)
                )
                .reduce((obj, key) => {
                  obj[key] = item[key];
                  return obj;
                }, {} as any),

              // Explicitly assign the group name
              groupName: groupName,
              GroupName: groupName,
              RecordArtist: groupName,
              RecordGenre: groupName,

              // Required properties by the template
              titleRecord: title,
              amount: quantity,
              price: price,
              total: total,
              imageRecord: image,
              stock: stock,

              // Record details
              RecordTitle: title,
              RecordPrice: price,
              RecordImage: image,
              RecordYear: "Year not available",
              Quantity: quantity,
              Subtotal: total,
            };

            return mappedItem as ExtendedCartDetail;
          });

          this.filteredCartDetails = [...this.cartDetails];

          // We remove the second mapping that overwrites the correct group names
          // and only keep the first mapping that already correctly extracts nameGroup from recordDetails

          // We create the maps for reference, but we don't use them to overwrite the data
          const groupMap = new Map<string, string>();
          groups.forEach((group: IGroup & { _id?: string }) => {
            if (group?._id) {
              groupMap.set(group._id, group.NameGroup || "Unnamed Group");
            }
            if (group?.IdGroup) {
              groupMap.set(
                String(group.IdGroup),
                group.NameGroup || "Unnamed Group"
              );
            }
          });

          const completeRecordMap = new Map<string, IRecord>();
          completeRecordDetails.forEach((record: IRecord | null) => {
            if (record) {
              completeRecordMap.set(String(record.IdRecord), record);
            }
          });

          this.filteredCartDetails = this.getFilteredCartDetails();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error("Error in cart details subscription:", error);
          this.loading = false;
          this.showAlert("Failed to load cart details.", "error");
          this.cdr.detectChanges();
        },
      });
  }

  private loadRecordDetails(): void {
    // This method is now redundant as loadCartDetails fetches all necessary data
    // We are keeping it empty to avoid breaking existing calls or references
    // while ensuring it does not perform unnecessary operations.
  }

  private getFilteredCartDetails(): ExtendedCartDetail[] {
    if (!Array.isArray(this.cartDetails)) return [];

    return this.cartDetails
      .filter((detail): detail is ExtendedCartDetail => {
        const amount = detail.amount ?? detail.Amount;
        const recordId = detail.recordId ?? detail.RecordId;

        return (
          detail &&
          typeof amount === "number" &&
          amount > 0 &&
          (typeof recordId === "string" || typeof recordId === "number") // Allow string for recordId
        );
      })
      .map((detail: any) => {
        const amount = detail.amount ?? detail.Amount ?? 0;
        const price = detail.price ?? detail.Price ?? 0;
        const titleRecord = detail.titleRecord ?? detail.TitleRecord ?? "";
        const groupName = detail.groupName ?? detail.GroupName ?? "";
        const imageRecord = detail.imageRecord ?? detail.ImageRecord ?? "";
        const total = detail.total ?? detail.Total ?? price * amount;
        const recordId = detail.recordId ?? detail.RecordId;
        const stock = detail.stock ?? 0;

        return {
          ...detail,
          idCartDetail: detail.idCartDetail ?? detail.IdCartDetail,
          recordId: recordId,
          amount: amount,
          price: price,
          total: total,
          titleRecord: titleRecord,
          groupName: groupName,
          imageRecord: imageRecord,
          stock: stock,
          // Keep original properties for backward compatibility
          IdCartDetail: detail.IdCartDetail ?? detail.idCartDetail,
          RecordId: recordId,
          Amount: amount,
          Price: price,
          Total: total,
          TitleRecord: titleRecord,
          GroupName: groupName,
          ImageRecord: imageRecord,
        } as ExtendedCartDetail;
      });
  }

  async addToCart(detail: ExtendedCartDetail): Promise<void> {
    if (!this.currentViewedEmail || this.isAddingToCart) return;

    this.isAddingToCart = true;
    this.clearAlert();

    try {
      const updatedDetail = await this.cartDetailService
        .addToCartDetail(this.currentViewedEmail, detail.recordId ?? 0, 1)
        .toPromise();

      // Update UI locally first for better user experience
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const cartItem = this.filteredCartDetails[itemIndex];
        if (cartItem) {
          cartItem.amount = (cartItem.amount ?? 0) + 1;
          cartItem.Amount = (cartItem.Amount ?? 0) + 1;
          this.updateCartTotals();
        }
      }

      // Refresh data from the server
      await this.loadCartDetails(this.currentViewedEmail);

      // Update the stock value in the UI
      const updatedRecord = await this.cartDetailService
        .getRecordDetails(detail.recordId ?? 0)
        .toPromise();
      if (updatedRecord) {
        const stockIndex = this.filteredCartDetails.findIndex(
          (d) => d.recordId === detail.recordId
        );
        if (stockIndex !== -1) {
          this.filteredCartDetails[stockIndex].stock = updatedRecord.stock;
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      // Revert local changes if it fails
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const cartItem = this.filteredCartDetails[itemIndex];
        if (cartItem) {
          cartItem.amount = (cartItem.amount ?? 0) - 1;
          cartItem.Amount = (cartItem.Amount ?? 0) - 1;
          this.updateCartTotals();
        }
      }
    } finally {
      this.isAddingToCart = false;
    }
  }

  async removeRecord(detail: ExtendedCartDetail): Promise<void> {
    if (!this.currentViewedEmail || (detail.amount || detail.Amount) <= 0)
      return;

    try {
      await this.cartDetailService
        .removeFromCartDetail(this.currentViewedEmail, detail.recordId ?? 0, 1)
        .toPromise();

      // Update UI locally first for better user experience
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const updatedItem = {
          ...this.filteredCartDetails[itemIndex],
          amount: Math.max(
            0,
            (this.filteredCartDetails[itemIndex].amount ?? 0) - 1
          ),
          Amount: Math.max(
            0,
            (this.filteredCartDetails[itemIndex].Amount ?? 0) - 1
          ),
        };
        this.filteredCartDetails[itemIndex] = updatedItem;
        this.updateCartTotals();
      }

      // Refresh data from the server
      await this.loadCartDetails(this.currentViewedEmail);

      // Update the stock value in the UI
      const updatedRecord = await this.cartDetailService
        .getRecordDetails(detail.recordId ?? 0)
        .toPromise();
      if (updatedRecord) {
        const stockIndex = this.filteredCartDetails.findIndex(
          (d) => d.recordId === detail.recordId
        );
        if (stockIndex !== -1) {
          this.filteredCartDetails[stockIndex].stock = updatedRecord.stock;
        }
      }

      this.showAlert("Product removed from cart", "success");
    } catch (error) {
      console.error("Error removing from cart:", error);
      this.showAlert("Failed to remove product from cart", "error");
      // Revert local changes if it fails
      const itemIndex = this.filteredCartDetails.findIndex(
        (d) => d.recordId === detail.recordId
      );
      if (itemIndex !== -1) {
        const cartItem = this.filteredCartDetails[itemIndex];
        if (cartItem) {
          cartItem.amount = (cartItem.amount ?? 0) + 1;
          cartItem.Amount = (cartItem.Amount ?? 0) + 1;
          this.updateCartTotals();
        }
      }
    }
  }

  private updateCartTotals(): void {
    const totalItems = this.filteredCartDetails.reduce(
      (sum, d) => sum + (d.amount ?? d.Amount ?? 0),
      0
    );
    const totalPrice = this.filteredCartDetails.reduce(
      (sum, d) => sum + (d.price ?? d.Price ?? 0) * (d.amount ?? d.Amount ?? 0),
      0
    );
    this.cartService.updateCartNavbar(totalItems, totalPrice);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up any scroll listeners
    if (this.handleScrollBound) {
      window.removeEventListener("scroll", this.handleScrollBound);
    }
  }

  private initializeScrollTracking(): void {
    if (this.cartContainer && this.cartContainer.nativeElement) {
      // Save initial scroll position
      this.lastScrollPosition = window.scrollY;

      // Add a listener for the scroll event
      window.addEventListener("scroll", this.handleScrollBound, {
        passive: true,
      });
    }
  }

  private handleScroll = (): void => {
    const currentScroll = window.scrollY;
    const cartElement = this.cartContainer?.nativeElement;

    if (cartElement) {
      // Hide/show elements based on scroll position
      if (currentScroll > 100 && currentScroll > this.lastScrollPosition) {
        // Scrolling down
        cartElement.classList.add("scrolling-down");
      } else {
        cartElement.classList.remove("scrolling-down");
      }

      this.lastScrollPosition = currentScroll;
    }
  };

  private refreshCart(): void {
    if (!this.currentViewedEmail) return;

    // Reset cart data
    this.cartDetails = [];
    this.filteredCartDetails = [];

    // Force reload the cart details
    this.loadCartDetails(this.currentViewedEmail);

    // Update the cart count in the navbar using the cart$ observable
    this.cartService
      .getCart(this.currentViewedEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart: any) => {
          const itemCount = cart?.items?.length || 0;
          const totalPrice = cart?.totalPrice || 0;
          this.cartService.updateCartNavbar(itemCount, totalPrice);
        },
        error: (error: any) => {
          console.error("Error refreshing cart count:", error);
          this.cartService.updateCartNavbar(0, 0);
        },
      });
  }

  async createOrder(): Promise<void> {
    if (!this.currentViewedEmail || this.isViewingAsAdmin) return;

    this.isCreatingOrder = true;
    this.clearAlert();

    try {
      const paymentMethod = "credit-card";

      const order = await this.orderService
        .createOrderFromCart(this.currentViewedEmail, paymentMethod)
        .pipe(
          catchError((error) => {
            console.error("Order creation error:", {
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              error: error.error,
              headers: error.headers,
              message: error.message,
              name: error.name,
              stack: error.stack,
            });
            return throwError(() => error);
          })
        )
        .toPromise();

      if (!order) {
        throw new Error("No order was returned from the server");
      }

      this.showAlert("Order created successfully", "success");

      // Refresh the cart to get the latest state from the server
      this.refreshCart();
    } catch (error: any) {
      console.error("Order creation failed:", error);
      let errorMsg = "Failed to create order";

      if (error.status === 400) {
        errorMsg = "Invalid request. Please check your cart and try again.";
      } else if (error.status === 401 || error.status === 403) {
        errorMsg = "Authentication required. Please log in again.";
      } else if (error.status === 500) {
        errorMsg = "Server error. Please try again later or contact support.";
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      }

      this.showAlert(errorMsg, "error");
    } finally {
      this.isCreatingOrder = false;
    }
  }

  private showAlert(message: string, type: "success" | "error"): void {
    this.alertMessage = message;
    this.alertType = type;

    // Hide the message after 5 seconds
    setTimeout(() => this.clearAlert(), 5000);
  }

  private clearAlert(): void {
    this.alertMessage = "";
    this.alertType = null;
  }

  shouldDisableAddButton(detail: any): boolean {
    // Check if we're in the process of adding to cart
    if (this.isAddingToCart) {
      return true;
    }

    // Check stock in all possible locations
    const stock =
      detail.stock ?? detail.recordDetails?.stock ?? detail.record?.stock ?? 0;

    // If stock is undefined, don't disable the button
    if (stock === undefined || stock === null) {
      return false;
    }

    // Convert to number and check if it's 0 or less
    const stockNumber = Number(stock);
    const shouldDisable = !isNaN(stockNumber) && stockNumber <= 0;

    return shouldDisable;
  }

  isAddButtonDisabled(detail: any): boolean {
    // Check if we're in the process of adding to cart
    if (this.isAddingToCart) {
      return true;
    }

    // Function to check stock
    const checkStock = (value: any): boolean => {
      // Convert to number and check if it's 0 or less
      const numValue = Number(value);
      return !isNaN(numValue) && numValue <= 0;
    };

    // Check stock in record.data.stock
    if (detail.recordDetails?.stock !== undefined) {
      const shouldDisable = checkStock(detail.recordDetails.stock);
      console.log(
        "Stock from record.data.stock:",
        detail.recordDetails.stock,
        "Disable:",
        shouldDisable
      );
      return shouldDisable;
    }

    // Check stock in record.stock
    if (detail.record?.stock !== undefined) {
      const shouldDisable = checkStock(detail.record.stock);
      console.log(
        "Stock from record.stock:",
        detail.record.stock,
        "Disable:",
        shouldDisable
      );
      return shouldDisable;
    }

    // Check stock in detail.stock
    if (detail.stock !== undefined) {
      const shouldDisable = checkStock(detail.stock);
      console.log(
        "Stock from detail.stock:",
        detail.stock,
        "Disable:",
        shouldDisable
      );
      return shouldDisable;
    }

    // If no stock information is found, enable the button
    console.log("No stock information found, enabling button");
    return false;
  }
}
