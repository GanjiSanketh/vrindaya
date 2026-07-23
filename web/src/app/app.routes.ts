import { Routes } from '@angular/router';
import { APP_ROUTES } from './core/constants/routes.constants';
import { MaintenanceGuard } from './guards/maintenance.guard';

export const routes: Routes = [
  /* ── Maintenance page (outside the public shell, no header/footer) ── */
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./features/maintenance/maintenance-page.component').then(m => m.MaintenancePageComponent),
  },

  /* ── Main site shell (Header + Footer via LayoutComponent) ── */
  {
    path: '',
    canActivate: [MaintenanceGuard],
    loadComponent: () =>
      import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: APP_ROUTES.HOME,
        loadChildren: () =>
          import('./features/home/home.routes').then(m => m.HOME_ROUTES),
      },
      {
        path: APP_ROUTES.CATEGORY,
        loadChildren: () =>
          import('./features/products/products.routes').then(m => m.PRODUCTS_ROUTES),
      },
      {
        path: APP_ROUTES.PRODUCT,
        loadChildren: () =>
          import('./features/product-detail/product-detail.routes').then(m => m.PRODUCT_DETAIL_ROUTES),
      },
      {
        path: APP_ROUTES.SHOP,
        loadChildren: () =>
          import('./features/shop/shop.routes').then(m => m.SHOP_ROUTES),
      },
      {
        path: APP_ROUTES.NEW_ARRIVALS,
        loadChildren: () =>
          import('./features/new-arrivals/new-arrivals.routes').then(m => m.NEW_ARRIVALS_ROUTES),
      },
      {
        path: APP_ROUTES.TRENDING,
        loadChildren: () =>
          import('./features/trending/trending.routes').then(m => m.TRENDING_ROUTES),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page.component').then(m => m.WishlistPageComponent),
      },
      {
        path: APP_ROUTES.NOT_FOUND,
        loadComponent: () =>
          import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
      },
      {
        path: 'offline',
        loadComponent: () =>
          import('./features/offline/offline.component').then(m => m.OfflineComponent),
      },
    ],
  },

  /* ── Admin shell (no header/footer) ── */
  {
    path: APP_ROUTES.ADMIN,
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  /* ── Fallback ── */
  { path: '**', redirectTo: '/not-found' },
];
