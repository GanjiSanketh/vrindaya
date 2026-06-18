import { Routes }         from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';

export const ADMIN_ROUTES: Routes = [
  /* ── Public: login ── */
  {
    path:          'login',
    loadComponent: () => import('./pages/login/admin-login.component').then(m => m.AdminLoginComponent),
  },

  /* ── Protected shell with sidebar ── */
  {
    path:          '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate:   [adminAuthGuard],
    children: [
      { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path:          'dashboard',
        loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path:          'products',
        loadComponent: () => import('./pages/product-list/admin-product-list.component').then(m => m.AdminProductListComponent),
      },
      {
        path:          'products/new',
        loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
      },
      {
        path:          'products/:id/edit',
        loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
      },
      {
        path:          'popup-config',
        loadComponent: () => import('./pages/popup-config/popup-config.component').then(m => m.PopupConfigComponent),
      },
      {
        path:          'exit-intent',
        loadComponent: () => import('./pages/exit-intent-config/exit-intent-config.component').then(m => m.ExitIntentConfigComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
