import { Component, inject, signal, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constants';

export interface NavLeaf {
  label: string;
  path?: string;
  icon: string;
  exact?: boolean;
  comingSoon?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  icon: string;
  items: NavLeaf[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'catalog', label: 'Catalog', icon: 'bi-grid-3x3-gap',
    items: [
      { label: 'Products', path: 'products', icon: 'bi-box-seam' },
      { label: 'Inventory', path: 'inventory', icon: 'bi-boxes' },
      { label: 'Pricing', path: 'pricing', icon: 'bi-currency-rupee' },
      { label: 'Categories', path: 'categories', icon: 'bi-tags' },
    ],
  },
  {
    key: 'flipkart', label: 'Flipkart Operations', icon: 'bi-shop',
    items: [
      { label: 'Flipkart Ops', path: 'flipkart-ops', icon: 'bi-cart' },
    ],
  },
];

const EXPANDED_STORAGE_KEY = 'vrindaya_admin_nav_expanded';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly pid = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly auth = inject(AdminAuthService);
  readonly BASE = `/${APP_ROUTES.ADMIN}`;
  readonly sideOpen = signal(false);
  readonly sections = NAV_SECTIONS;

  readonly expandedSection = signal<string | null>(this.loadExpanded());

  constructor() {
    const currentUrl = this.router.url;
    const active = this.sections.find(section =>
      section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`)),
    );
    if (active && this.expandedSection() !== active.key) {
      this.expandedSection.set(active.key);
      this.persistExpanded(active.key);
    }
  }

  toggleSide(): void { this.sideOpen.update(v => !v); }
  closeSide(): void { this.sideOpen.set(false); }

  toggleSection(key: string): void {
    const next = this.expandedSection() === key ? null : key;
    this.expandedSection.set(next);
    this.persistExpanded(next);
  }

  isExpanded(key: string): boolean {
    return this.expandedSection() === key;
  }

  isSectionActive(section: NavSection): boolean {
    const currentUrl = this.router.url;
    return section.items.some(item => item.path && currentUrl.startsWith(`${this.BASE}/${item.path}`));
  }

  isChildActive(item: NavLeaf): boolean {
    if (!item.path) return false;
    const currentUrl = this.router.url;
    const target = `${this.BASE}/${item.path}`;
    return item.exact ? currentUrl === target : currentUrl.startsWith(target);
  }

  async signOut(): Promise<void> { await this.auth.signOut(); }

  handleKeydown(event: KeyboardEvent, key: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleSection(key);
    }
  }

  private loadExpanded(): string | null {
    if (!isPlatformBrowser(this.pid)) return null;
    try { return localStorage.getItem(EXPANDED_STORAGE_KEY); } catch { return null; }
  }

  private persistExpanded(key: string | null): void {
    if (!isPlatformBrowser(this.pid)) return;
    if (key) { localStorage.setItem(EXPANDED_STORAGE_KEY, key); } else { localStorage.removeItem(EXPANDED_STORAGE_KEY); }
  }
}
