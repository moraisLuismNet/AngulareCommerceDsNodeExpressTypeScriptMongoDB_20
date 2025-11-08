import { Routes } from "@angular/router";
import { AuthGuard } from "./guards/auth-guard";

export const routes: Routes = [
  // Public routes
  {
    path: "login",
    loadComponent: () =>
      import("./shared/login/login").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () =>
      import("./shared/register/register").then(
        (m) => m.RegisterComponent
      ),
  },
  // Ecommerce routes
  {
    path: "",
    loadComponent: () =>
      import("./ecommerce/ecommerce").then((m) => m.EcommerceComponent),
    children: [
      // Public routes
      {
        path: "listrecords/:idGroup",
        loadComponent: () =>
          import("./ecommerce/list-records/list-records").then(
            (m) => m.ListrecordsComponent
          ),
      },
      {
        path: "cart-details",
        loadComponent: () =>
          import("./ecommerce/cart-details/cart-details").then(
            (m) => m.CartDetailsComponent
          ),
      },
      {
        path: "",
        loadComponent: () =>
          import("./ecommerce/list-groups/list-groups").then(
            (m) => m.ListgroupsComponent
          ),
      },
      // Protected routes (require authentication)
      {
        path: "listgroups",
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () =>
          import("./ecommerce/list-groups/list-groups").then(
            (m) => m.ListgroupsComponent
          ),
      },
      {
        path: "genres",
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () =>
          import("./ecommerce/genres/genres").then((m) => m.GenresComponent),
      },
      {
        path: "groups",
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () =>
          import("./ecommerce/groups/groups").then((m) => m.GroupsComponent),
      },
      {
        path: "records",
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () =>
          import("./ecommerce/records/records").then((m) => m.RecordsComponent),
      },
      {
        path: "carts",
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () =>
          import("./ecommerce/carts/carts").then((m) => m.CartsComponent),
      },
      {
        path: "orders",
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () =>
          import("./ecommerce/orders/orders").then((m) => m.OrdersComponent),
      },
      {
        path: "admin-orders",
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () =>
          import("./ecommerce/admin-orders/admin-orders").then(
            (m) => m.AdminOrdersComponent
          ),
      },
      {
        path: "users",
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () =>
          import("./ecommerce/users/users").then((m) => m.UsersComponent),
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
