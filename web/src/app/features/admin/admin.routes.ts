import { Routes }              from '@angular/router';
import { adminAuthGuard }      from './guards/admin-auth.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/admin-login.component').then(m => m.AdminLoginComponent) },

  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'inventory', loadComponent: () => import('./pages/inventory/admin-inventory.component').then(m => m.AdminInventoryComponent) },
      { path: 'pricing', loadComponent: () => import('./pages/pricing-dashboard/pricing-dashboard.component').then(m => m.PricingDashboardComponent) },

      { path: 'products', loadComponent: () => import('./pages/product-list/admin-product-list.component').then(m => m.AdminProductListComponent) },
      { path: 'products/new', loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent), canDeactivate: [unsavedChangesGuard] },
      { path: 'products/:id/edit', loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent), canDeactivate: [unsavedChangesGuard] },

      { path: 'categories', loadComponent: () => import('./pages/categories/category-list.component').then(m => m.CategoryListComponent) },
      { path: 'categories/new', loadComponent: () => import('./pages/categories/category-form.component').then(m => m.CategoryFormComponent) },
      { path: 'categories/:id/edit', loadComponent: () => import('./pages/categories/category-form.component').then(m => m.CategoryFormComponent) },

      { path: 'sales', redirectTo: 'sales/orders', pathMatch: 'full' },
      { path: 'sales/orders', loadComponent: () => import('./pages/sales/sale-list/sale-list.component').then(m => m.SaleListComponent) },
      { path: 'sales/record', loadComponent: () => import('./pages/sales/record-sale/record-sale.component').then(m => m.RecordSaleComponent) },
      { path: 'sales/:id', loadComponent: () => import('./pages/sales/sale-detail/sale-detail.component').then(m => m.SaleDetailComponent) },
      { path: 'sales/:id/edit', loadComponent: () => import('./pages/sales/record-sale/record-sale.component').then(m => m.RecordSaleComponent) },
      { path: 'flipkart-ops', loadComponent: () => import('./pages/flipkart-ops/flipkart-ops-list.component').then(m => m.FlipkartOpsListComponent) },
      { path: 'popup-config', loadComponent: () => import('./pages/popup-config/popup-config.component').then(m => m.PopupConfigComponent) },
      { path: 'hero-banners', loadComponent: () => import('./pages/hero-banners/hero-banner-management.component').then(m => m.HeroBannerManagementComponent) },
      { path: 'hero-showcase', loadComponent: () => import('./pages/hero-showcase/hero-showcase-management.component').then(m => m.HeroShowcaseManagementComponent) },
      { path: 'exit-intent', loadComponent: () => import('./pages/exit-intent-config/exit-intent-config.component').then(m => m.ExitIntentConfigComponent) },
      { path: 'analytics-settings', loadComponent: () => import('./pages/analytics-settings/analytics-settings.component').then(m => m.AnalyticsSettingsComponent) },
      { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'analytics/product/:id', loadComponent: () => import('./pages/analytics/product-analytics-detail.component').then(m => m.ProductAnalyticsDetailComponent) },
      { path: 'bi', loadComponent: () => import('./pages/bi-dashboard/bi-dashboard.component').then(m => m.BIDashboardComponent) },

      { path: 'marketplace', loadChildren: () => import('./marketplace/marketplace.routes').then(m => m.MARKETPLACE_ROUTES) },
      { path: 'ai-workspace', loadComponent: () => import('../vrindaya-ai/workspace.component').then(m => m.WorkspaceComponent) },
      { path: '**', redirectTo: 'products' },
    ],
  },
];
