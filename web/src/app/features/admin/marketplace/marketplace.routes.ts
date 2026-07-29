import { Routes } from '@angular/router';
import { RolePermissionsGuard } from './services/production/role-permissions.guard';

export const MARKETPLACE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/marketplace-dashboard.component').then(m => m.MarketplaceDashboardComponent), canActivate: [RolePermissionsGuard], data: { resource: 'analytics', action: 'read' } },

  { path: 'products', loadComponent: () => import('./pages/products/marketplace-products.component').then(m => m.MarketplaceProductsComponent), canActivate: [RolePermissionsGuard], data: { resource: 'products', action: 'read' } },

  { path: 'workspace/:id', loadComponent: () => import('./pages/workspace/marketplace-product-workspace.component').then(m => m.MarketplaceProductWorkspaceComponent), canActivate: [RolePermissionsGuard], data: { resource: 'products', action: 'update' } },

  { path: 'vision-analysis', loadComponent: () => import('./pages/vision-analysis/vision-analysis.component').then(m => m.VisionAnalysisComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'create' } },

  { path: 'ai-studio', loadComponent: () => import('./pages/ai-listing-studio/ai-listing-studio.component').then(m => m.AITestingStudioComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'create' } },

  { path: 'listings', loadComponent: () => import('./pages/listings/marketplace-listings.component').then(m => m.MarketplaceListingsComponent), canActivate: [RolePermissionsGuard], data: { resource: 'listings', action: 'read' } },
  { path: 'listings/:id', loadComponent: () => import('./pages/listings/marketplace-listing-detail.component').then(m => m.MarketplaceListingDetailComponent), canActivate: [RolePermissionsGuard], data: { resource: 'listings', action: 'read' } },

  { path: 'sync-centre', loadComponent: () => import('./pages/sync-centre/marketplace-sync-centre.component').then(m => m.MarketplaceSyncCentreComponent), canActivate: [RolePermissionsGuard], data: { resource: 'sync', action: 'read' } },

  { path: 'analytics', loadComponent: () => import('./pages/analytics/marketplace-analytics.component').then(m => m.MarketplaceAnalyticsComponent), canActivate: [RolePermissionsGuard], data: { resource: 'analytics', action: 'read' } },

  { path: 'settings', loadComponent: () => import('./pages/settings/marketplace-settings.component').then(m => m.MarketplaceSettingsComponent), canActivate: [RolePermissionsGuard], data: { resource: 'settings', action: 'read' } },

  { path: 'prompts', loadComponent: () => import('./pages/prompts/prompt-management.component').then(m => m.PromptManagementComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'read' } },

  { path: 'version-history', loadComponent: () => import('./pages/version-history/version-history.component').then(m => m.VersionHistoryComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'read' } },

  { path: 'automation', loadComponent: () => import('./pages/automation/automation-dashboard.component').then(m => m.AutomationDashboardComponent), canActivate: [RolePermissionsGuard], data: { resource: 'automation', action: 'read' } },

  { path: 'ai-management', loadComponent: () => import('./pages/ai-management/ai-management.component').then(m => m.AIManagementComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'read' } },

  { path: 'inventory', loadComponent: () => import('./pages/inventory-automation/inventory-automation.component').then(m => m.InventoryAutomationComponent), canActivate: [RolePermissionsGuard], data: { resource: 'inventory', action: 'read' } },

  { path: 'marketing', loadComponent: () => import('./pages/marketing/marketing.component').then(m => m.MarketingComponent), canActivate: [RolePermissionsGuard], data: { resource: 'ai', action: 'create' } },
];
