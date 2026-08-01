import { Injectable, signal } from '@angular/core';

export interface SearchResult {
  label: string;
  path: string;
  icon: string;
  section: string;
  type: 'page';
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly pages: SearchResult[] = [
    { label: 'Dashboard', path: 'dashboard', icon: 'bi-grid-1x2', section: 'General', type: 'page' },
    { label: 'Products', path: 'products', icon: 'bi-box-seam', section: 'Catalog', type: 'page' },
    { label: 'Inventory', path: 'inventory', icon: 'bi-boxes', section: 'Catalog', type: 'page' },
    { label: 'Pricing', path: 'pricing', icon: 'bi-currency-rupee', section: 'Catalog', type: 'page' },
    { label: 'Categories', path: 'categories', icon: 'bi-tags', section: 'Site Content', type: 'page' },
    { label: 'Flipkart Ops', path: 'flipkart-ops', icon: 'bi-cart', section: 'Flipkart Operations', type: 'page' },
    { label: 'Sales Orders', path: 'sales/orders', icon: 'bi-cart-check', section: 'Sales', type: 'page' },
    { label: 'Record Sale', path: 'sales/record', icon: 'bi-plus-circle', section: 'Sales', type: 'page' },
    { label: 'Analytics Dashboard', path: 'analytics', icon: 'bi-speedometer2', section: 'Analytics', type: 'page' },
    { label: 'Hero Showcase', path: 'hero-showcase', icon: 'bi-images', section: 'Site Content', type: 'page' },
    { label: 'Marketplace Dashboard', path: 'marketplace/dashboard', icon: 'bi-speedometer2', section: 'Marketplace', type: 'page' },
    { label: 'Marketplace Products', path: 'marketplace/products', icon: 'bi-box-seam', section: 'Marketplace', type: 'page' },
    { label: 'Marketplace Listings', path: 'marketplace/listings', icon: 'bi-card-list', section: 'Marketplace', type: 'page' },
    { label: 'Sync Centre', path: 'marketplace/sync-centre', icon: 'bi-arrow-repeat', section: 'Marketplace', type: 'page' },
    { label: 'Marketing AI', path: 'marketplace/marketing', icon: 'bi-megaphone', section: 'Marketplace', type: 'page' },
    { label: 'Marketplace Settings', path: 'marketplace/settings', icon: 'bi-gear', section: 'Marketplace', type: 'page' },
  ];

  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly selectedIndex = signal(-1);
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
    this.query.set('');
    this.resetResults();
    this.selectedIndex.set(-1);
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
    this.results.set([]);
    this.selectedIndex.set(-1);
  }

  search(q: string): void {
    this.query.set(q);
    this.selectedIndex.set(-1);
    if (!q.trim()) {
      this.results.set(this.pages.slice(0, 8));
      return;
    }
    const lower = q.toLowerCase();
    const scored = this.pages
      .map(p => {
        let score = 0;
        if (p.label.toLowerCase().includes(lower)) score += 10;
        if (p.label.toLowerCase().startsWith(lower)) score += 5;
        if (p.section.toLowerCase().includes(lower)) score += 3;
        if (p.path.toLowerCase().includes(lower)) score += 2;
        return { ...p, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    this.results.set(scored);
  }

  resetResults(): void {
    this.results.set(this.pages.slice(0, 8));
  }

  navigate(index: number): { path: string } | null {
    const r = this.results()[index];
    return r ? { path: r.path } : null;
  }
}
