import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminRole } from '../models/admin-user.model';
import { APP_ROUTES } from '../../../core/constants/routes.constants';

export interface NavLeaf {
  label: string;
  path?: string;
  icon: string;
  exact?: boolean;
  roles?: AdminRole[];
  comingSoon?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  items: NavLeaf[];
}

/**
 * The full admin nav taxonomy, grouped for the collapsible tree sidebar.
 * Every `path` here must correspond to a real route in admin.routes.ts —
 * `comingSoon` leaves have no path and render as disabled, non-navigable
 * placeholders (Sales/Reports/Administration/Settings sections that don't
 * have a built module yet).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'catalog', label: 'Catalog', icon: 'bi-bag-heart',
    items: [
      { label: 'Products', path: 'products', icon: 'bi-bag-heart' },
      { label: 'Categories', path: 'categories', icon: 'bi-grid-3x3-gap', exact: false },
      { label: 'Collections', path: 'collections', icon: 'bi-collection', exact: false },
      { label: 'Inventory', path: 'inventory', icon: 'bi-boxes', exact: false },
      { label: 'Forecast', path: 'inventory/forecast', icon: 'bi-graph-up' },
      { label: 'Suppliers', path: 'suppliers', icon: 'bi-truck', exact: false },
      { label: 'Flipkart Operations', path: 'flipkart-ops', icon: 'bi-shop' },
    ],
  },
  {
    key: 'homepage', label: 'Homepage', icon: 'bi-house-heart',
    items: [
      { label: 'Homepage', path: 'homepage', icon: 'bi-house-heart', exact: true },
      { label: 'Hero Banner', path: 'homepage/hero-banners', icon: 'bi-image', exact: false },
      { label: 'Promotional Banner', path: 'homepage/promotional-banners', icon: 'bi-megaphone-fill', exact: false },
      { label: 'Homepage Settings', path: 'homepage/settings', icon: 'bi-sliders' },
      { label: 'Brand Settings', path: 'brand', icon: 'bi-award' },
    ],
  },
  {
    key: 'marketing', label: 'Marketing', icon: 'bi-envelope-heart',
    items: [
      { label: 'Marketing Dashboard', path: 'marketing', icon: 'bi-graph-up' },
      { label: 'Campaigns', path: 'campaigns', icon: 'bi-send', exact: false },
      { label: 'Campaign Queue', path: 'campaign-queue', icon: 'bi-list-task' },
      { label: 'Delivery Dashboard', path: 'delivery-dashboard', icon: 'bi-speedometer2' },
      { label: 'Templates', path: 'campaign-templates', icon: 'bi-file-text', exact: false },
      { label: 'WhatsApp', path: 'whatsapp-settings', icon: 'bi-whatsapp' },
      { label: 'Popup Campaign', path: 'popup-config', icon: 'bi-megaphone', roles: ['SuperAdmin', 'Admin'] },
      { label: 'Exit Intent', path: 'exit-intent', icon: 'bi-door-open', roles: ['SuperAdmin', 'Admin'] },
      { label: 'Contacts', path: 'marketing-contacts', icon: 'bi-person-lines-fill' },
    ],
  },
  {
    key: 'marketplace', label: 'Marketplace', icon: 'bi-shop',
    items: [
      { label: 'Dashboard', path: 'marketplace/dashboard', icon: 'bi-speedometer2', exact: true },
      { label: 'Profitability', path: 'marketplace/profitability', icon: 'bi-graph-up-arrow' },
      { label: 'Flipkart', path: 'marketplace/flipkart', icon: 'bi-cart', roles: ['SuperAdmin'] },
      { label: 'Listings', path: 'marketplace/listings', icon: 'bi-list-ul' },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: 'bi-cash-coin',
    items: [
      { label: 'P&L Dashboard', path: 'pnl', icon: 'bi-bar-chart-fill', exact: true },
      { label: 'Cash Flow', path: 'cash-flow', icon: 'bi-arrow-left-right', exact: true },
      { label: 'Settlement Recon.', path: 'settlement-reconciliation', icon: 'bi-clipboard-check', exact: true },
      { label: 'Revenue', path: 'revenues', icon: 'bi-graph-up-arrow', exact: false },
      { label: 'Expenses', path: 'expenses', icon: 'bi-receipt-cutoff', exact: false },
    ],
  },
  {
    key: 'sales', label: 'Sales', icon: 'bi-cart-check',
    items: [
      { label: 'Orders', icon: 'bi-receipt', comingSoon: true },
      { label: 'Customers', icon: 'bi-people', comingSoon: true },
      { label: 'Coupons', icon: 'bi-ticket-perforated', comingSoon: true },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: 'bi-bar-chart-line',
    items: [
      { label: 'Dashboard Analytics', path: 'analytics', icon: 'bi-bar-chart-line', roles: ['SuperAdmin', 'Admin'] },
      { label: 'Inventory Reports', path: 'reports', icon: 'bi-bar-chart-steps', roles: ['SuperAdmin', 'Admin'] },
      { label: 'Sales Reports', icon: 'bi-graph-up-arrow', comingSoon: true },
    ],
  },
  {
    key: 'administration', label: 'Administration', icon: 'bi-shield-check',
    items: [
      { label: 'Admin Users', path: 'admin-users', icon: 'bi-shield-check', roles: ['SuperAdmin'] },
      { label: 'Audit Logs', path: 'audit-logs', icon: 'bi-journal-text', roles: ['SuperAdmin'] },
      { label: 'Roles & Permissions', icon: 'bi-key', comingSoon: true },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: 'bi-gear',
    items: [
      { label: 'General', icon: 'bi-gear', comingSoon: true },
      { label: 'Integrations', icon: 'bi-plug', comingSoon: true },
    ],
  },
];

const EXPANDED_STORAGE_KEY = 'vrindaya_admin_nav_expanded';

@Component({
  selector:    'app-admin-layout',
  standalone:  true,
  imports:     [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl:    './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private readonly pid    = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly auth            = inject(AdminAuthService);
  readonly BASE            = `/${APP_ROUTES.ADMIN}`;
  readonly sideOpen        = signal(false);
  readonly sections        = NAV_SECTIONS;

  readonly expandedSections = signal<Set<string>>(this.loadExpanded());

  constructor() {
    // Auto-expand whichever section contains the current route, so a hard
    // refresh on e.g. /admin/campaigns opens Marketing automatically.
    const currentUrl = this.router.url;
    const active = this.sections.find(section =>
      section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`)),
    );
    if (active && !this.expandedSections().has(active.key)) {
      const next = new Set(this.expandedSections());
      next.add(active.key);
      this.expandedSections.set(next);
      this.persistExpanded(next);
    }
  }

  toggleSide(): void { this.sideOpen.update(v => !v); }
  closeSide():  void { this.sideOpen.set(false); }

  toggleSection(key: string): void {
    const next = new Set(this.expandedSections());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedSections.set(next);
    this.persistExpanded(next);
  }

  isExpanded(key: string): boolean {
    return this.expandedSections().has(key);
  }

  isSectionActive(section: NavSection): boolean {
    const currentUrl = this.router.url;
    return section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`));
  }

  hasAccess(item: NavLeaf): boolean {
    return !item.roles || this.auth.hasRole(item.roles);
  }

  async signOut(): Promise<void> { await this.auth.signOut(); }

  private loadExpanded(): Set<string> {
    if (!isPlatformBrowser(this.pid)) return new Set();
    try {
      const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }

  private persistExpanded(keys: Set<string>): void {
    if (!isPlatformBrowser(this.pid)) return;
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...keys]));
  }
}
