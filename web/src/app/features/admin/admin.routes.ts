import { Routes }              from '@angular/router';
import { adminAuthGuard }      from './guards/admin-auth.guard';
import { roleGuard }           from './guards/role.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

export const ADMIN_ROUTES: Routes = [
  /* ── Public: login ─────────────────────────────────────────────── */
  {
    path:          'login',
    loadComponent: () => import('./pages/login/admin-login.component').then(m => m.AdminLoginComponent),
  },

  /* ── Protected shell (sidebar + header) ────────────────────────── */
  {
    path:          '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate:   [adminAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      /* All authenticated roles */
      {
        path:          'dashboard',
        loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path:          'products',
        loadComponent: () => import('./pages/product-list/admin-product-list.component').then(m => m.AdminProductListComponent),
      },
      {
        path:            'products/new',
        loadComponent:   () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
        canDeactivate:   [unsavedChangesGuard],
      },
      {
        path:            'products/:id/edit',
        loadComponent:   () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
        canDeactivate:   [unsavedChangesGuard],
      },
      {
        path:          'flipkart-ops',
        loadComponent: () => import('./pages/flipkart-ops/flipkart-ops-list.component').then(m => m.FlipkartOpsListComponent),
      },


      /* Homepage CMS — literal-path routes ('new') must be declared before
         the ':id' param routes, or they'd be swallowed as an id. */
      {
        path:          'homepage',
        loadComponent: () => import('./pages/homepage/homepage-hub.component').then(m => m.HomepageHubComponent),
      },
      {
        path:          'homepage/hero-banners',
        loadComponent: () => import('./pages/homepage/hero-banners/hero-banner-list.component').then(m => m.HeroBannerListComponent),
      },
      {
        path:          'homepage/hero-banners/new',
        loadComponent: () => import('./pages/homepage/hero-banners/hero-banner-form.component').then(m => m.HeroBannerFormComponent),
      },
      {
        path:          'homepage/hero-banners/:id/edit',
        loadComponent: () => import('./pages/homepage/hero-banners/hero-banner-form.component').then(m => m.HeroBannerFormComponent),
      },
      {
        path:          'homepage/promotional-banners',
        loadComponent: () => import('./pages/homepage/promotional-banners/promotional-banner-list.component').then(m => m.PromotionalBannerListComponent),
      },
      {
        path:          'homepage/promotional-banners/new',
        loadComponent: () => import('./pages/homepage/promotional-banners/promotional-banner-form.component').then(m => m.PromotionalBannerFormComponent),
      },
      {
        path:          'homepage/promotional-banners/:id/edit',
        loadComponent: () => import('./pages/homepage/promotional-banners/promotional-banner-form.component').then(m => m.PromotionalBannerFormComponent),
      },
      {
        path:          'homepage/settings',
        loadComponent: () => import('./pages/homepage/settings/homepage-settings.component').then(m => m.HomepageSettingsComponent),
      },

      /* Brand CMS — own top-level nav entry (About Us/Contact/Store Info/
         Social Links/FAQs/Policies/Footer), single settings screen. */
      {
        path:          'brand',
        loadComponent: () => import('./pages/brand/brand-settings.component').then(m => m.BrandSettingsComponent),
      },

      /* Categories & Collections — own top-level nav entries, literal-path
         routes ('new') declared before ':id' param routes. */
      {
        path:          'categories',
        loadComponent: () => import('./pages/categories/category-list.component').then(m => m.CategoryListComponent),
      },
      {
        path:          'categories/new',
        loadComponent: () => import('./pages/categories/category-form.component').then(m => m.CategoryFormComponent),
      },
      {
        path:          'categories/:id/edit',
        loadComponent: () => import('./pages/categories/category-form.component').then(m => m.CategoryFormComponent),
      },
      {
        path:          'collections',
        loadComponent: () => import('./pages/collections/collection-list.component').then(m => m.CollectionListComponent),
      },
      {
        path:          'collections/new',
        loadComponent: () => import('./pages/collections/collection-form.component').then(m => m.CollectionFormComponent),
      },
      {
        path:          'collections/:id/edit',
        loadComponent: () => import('./pages/collections/collection-form.component').then(m => m.CollectionFormComponent),
      },

      {
        path:          'marketing',
        loadComponent: () => import('../marketing/components/marketing-dashboard/marketing-dashboard.component').then(m => m.MarketingDashboardComponent),
      },
      {
        path:          'marketing-contacts',
        loadComponent: () => import('../marketing/components/marketing-contacts/marketing-contacts.component').then(m => m.MarketingContactsComponent),
      },

      /* Campaigns — literal-path routes ('new', 'history') must be declared
         before the ':id' param routes, or they'd be swallowed as an id. */
      {
        path:          'campaigns',
        loadComponent: () => import('../marketing/components/campaign-list/campaign-list.component').then(m => m.CampaignListComponent),
      },
      {
        path:          'campaigns/new',
        loadComponent: () => import('../marketing/components/campaign-form/campaign-form.component').then(m => m.CampaignFormComponent),
      },
      {
        path:          'campaigns/history',
        loadComponent: () => import('../marketing/components/campaign-history/campaign-history.component').then(m => m.CampaignHistoryComponent),
      },
      {
        path:          'campaigns/:id/edit',
        loadComponent: () => import('../marketing/components/campaign-form/campaign-form.component').then(m => m.CampaignFormComponent),
      },
      {
        path:          'campaigns/:id/execution',
        loadComponent: () => import('../marketing/components/execution-progress/execution-progress.component').then(m => m.ExecutionProgressComponent),
      },
      {
        path:          'campaigns/:id/execution/recipients',
        loadComponent: () => import('../marketing/components/execution-details/execution-details.component').then(m => m.ExecutionDetailsComponent),
      },
      {
        path:          'campaigns/:id',
        loadComponent: () => import('../marketing/components/campaign-view/campaign-view.component').then(m => m.CampaignViewComponent),
      },

      /* WhatsApp Phase 3 — settings, templates, queue, delivery dashboard. */
      {
        path:          'whatsapp-settings',
        loadComponent: () => import('../marketing/components/whatsapp-settings/whatsapp-settings.component').then(m => m.WhatsAppSettingsComponent),
      },
      {
        path:          'campaign-templates',
        loadComponent: () => import('../marketing/components/template-list/template-list.component').then(m => m.TemplateListComponent),
      },
      {
        path:          'campaign-templates/new',
        loadComponent: () => import('../marketing/components/template-form/template-form.component').then(m => m.TemplateFormComponent),
      },
      {
        path:          'campaign-templates/:id/edit',
        loadComponent: () => import('../marketing/components/template-form/template-form.component').then(m => m.TemplateFormComponent),
      },
      {
        path:          'campaign-queue',
        loadComponent: () => import('../marketing/components/campaign-queue-list/campaign-queue-list.component').then(m => m.CampaignQueueListComponent),
      },
      {
        path:          'delivery-dashboard',
        loadComponent: () => import('../marketing/components/delivery-dashboard/delivery-dashboard.component').then(m => m.DeliveryDashboardComponent),
      },

      /* Settlement Reconciliation */
      {
        path:          'settlement-reconciliation',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/settlement-reconciliation/settlement-reconciliation.component').then(m => m.SettlementReconciliationComponent),
      },

      /* Cash Flow Dashboard */
      {
        path:          'cash-flow',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/cash-flow/cash-flow-dashboard.component').then(m => m.CashFlowDashboardComponent),
      },

      /* Revenue Management */
      {
        path:          'revenues',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/revenues/revenue-list.component').then(m => m.RevenueListComponent),
      },
      {
        path:          'revenues/new',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/revenues/revenue-form.component').then(m => m.RevenueFormComponent),
      },
      {
        path:          'revenues/:id/edit',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/revenues/revenue-form.component').then(m => m.RevenueFormComponent),
      },

      /* Expense Management */
      {
        path:          'expenses',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/expenses/expense-list.component').then(m => m.ExpenseListComponent),
      },
      {
        path:          'expenses/new',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/expenses/expense-form.component').then(m => m.ExpenseFormComponent),
      },
      {
        path:          'expenses/:id/edit',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/expenses/expense-form.component').then(m => m.ExpenseFormComponent),
      },

      /* SuperAdmin + Admin only */
      {
        path:          'popup-config',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/popup-config/popup-config.component').then(m => m.PopupConfigComponent),
      },
      {
        path:          'exit-intent',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/exit-intent-config/exit-intent-config.component').then(m => m.ExitIntentConfigComponent),
      },
      {
        path:          'analytics',
        canActivate:   [roleGuard(['SuperAdmin', 'Admin'])],
        loadComponent: () => import('./pages/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
      },
      {
        path:          'admin-users',
        canActivate:   [roleGuard(['SuperAdmin'])],
        loadComponent: () => import('./pages/admin-users/admin-users-list.component').then(m => m.AdminUsersListComponent),
      },
      {
        path:          'admin-users/new',
        canActivate:   [roleGuard(['SuperAdmin'])],
        loadComponent: () => import('./pages/admin-users/admin-user-form.component').then(m => m.AdminUserFormComponent),
      },
      {
        path:          'admin-users/:email/edit',
        canActivate:   [roleGuard(['SuperAdmin'])],
        loadComponent: () => import('./pages/admin-users/admin-user-form.component').then(m => m.AdminUserFormComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
