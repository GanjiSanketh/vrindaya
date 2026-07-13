import { Routes }         from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { roleGuard }      from './guards/role.guard';

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
        path:          'products/new',
        loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
      },
      {
        path:          'products/:id/edit',
        loadComponent: () => import('./pages/product-form/admin-product-form.component').then(m => m.AdminProductFormComponent),
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

      /* super_admin + admin only */
      {
        path:          'popup-config',
        canActivate:   [roleGuard(['super_admin', 'admin'])],
        loadComponent: () => import('./pages/popup-config/popup-config.component').then(m => m.PopupConfigComponent),
      },
      {
        path:          'exit-intent',
        canActivate:   [roleGuard(['super_admin', 'admin'])],
        loadComponent: () => import('./pages/exit-intent-config/exit-intent-config.component').then(m => m.ExitIntentConfigComponent),
      },
      {
        path:          'analytics',
        canActivate:   [roleGuard(['super_admin', 'admin'])],
        loadComponent: () => import('./pages/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
      },

      /* super_admin only */
      {
        path:          'admin-management',
        canActivate:   [roleGuard(['super_admin'])],
        loadComponent: () => import('./pages/admin-management/admin-management.component').then(m => m.AdminManagementComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
