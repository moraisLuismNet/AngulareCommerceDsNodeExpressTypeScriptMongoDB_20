import { Routes } from '@angular/router';
import { AuthGuard } from './guards/AuthGuardService';

export const routes: Routes = [
  // Public routes
  { 
    path: 'login',
    loadComponent: () => import('./shared/login/LoginComponent').then(m => m.LoginComponent)
  },
  { 
    path: 'register',
    loadComponent: () => import('./shared/register/RegisterComponent').then(m => m.RegisterComponent)
  },
  // Ecommerce routes
  {
    path: '',
    loadComponent: () => import('./ecommerce/EcommerceComponent').then(m => m.EcommerceComponent),
    children: [
      // Public routes
      { 
        path: 'listrecords/:idGroup',
        loadComponent: () => import('./ecommerce/listrecords/ListrecordsComponent').then(m => m.ListrecordsComponent)
      },
      { 
        path: 'cart-details',
        loadComponent: () => import('./ecommerce/CartDetails/CartDetailsComponent').then(m => m.CartDetailsComponent)
      },
      { 
        path: '',
        loadComponent: () => import('./ecommerce/listgroups/ListgroupsComponent').then(m => m.ListgroupsComponent)
      },
      // Protected routes (require authentication)
      { 
        path: 'listgroups',
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () => import('./ecommerce/listgroups/ListgroupsComponent').then(m => m.ListgroupsComponent)
      },
      { 
        path: 'genres',
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () => import('./ecommerce/genres/GenresComponent').then(m => m.GenresComponent)
      },
      { 
        path: 'groups',
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () => import('./ecommerce/groups/GroupsComponent').then(m => m.GroupsComponent)
      },
      { 
        path: 'records',
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () => import('./ecommerce/records/RecordsComponent').then(m => m.RecordsComponent)
      },
      { 
        path: 'carts',
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () => import('./ecommerce/carts/CartsComponent').then(m => m.CartsComponent)
      },
      { 
        path: 'orders',
        canActivate: [], // Add AuthGuard here if needed
        loadComponent: () => import('./ecommerce/orders/OrdersComponent').then(m => m.OrdersComponent)
      },
      { 
        path: 'admin-orders',
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () => import('./ecommerce/AdminOrders/AdminOrdersComponent').then(m => m.AdminOrdersComponent)
      },
      { 
        path: 'users',
        canActivate: [AuthGuard],
        data: { requiresAdmin: true },
        loadComponent: () => import('./ecommerce/users/UsersComponent').then(m => m.UsersComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];

