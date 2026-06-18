import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                                   from '@angular/common';
import { Product }                                             from '../models/product.model';
import productsData                                            from '../../data/products.json';

const STORAGE_KEY = 'vrindaya_products';

/**
 * Single source of truth for all product data.
 * Both the storefront and admin panel inject this service.
 *
 * Initialisation order (synchronous):
 *   1. If localStorage has data → use it (admin edits persisted between refreshes).
 *   2. Otherwise → seed from the bundled products.json and write to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ProductStoreService {
  private readonly pid = inject(PLATFORM_ID);

  private readonly _products = signal<Product[]>([]);
  private readonly _loaded   = signal(false);

  readonly products         = this._products.asReadonly();
  readonly isLoaded         = this._loaded.asReadonly();
  readonly totalCount       = computed(() => this._products().length);
  readonly newArrivalsCount = computed(() => this._products().filter(p => p.isNew).length);
  readonly trendingCount    = computed(() => this._products().filter(p => p.isTrending).length);
  readonly bestSellersCount = computed(() => this._products().filter(p => p.isBestSeller || p.isBestseller).length);

  constructor() { this.init(); }

  private init(): void {
    if (isPlatformBrowser(this.pid)) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Product[];
          this._products.set(parsed.map(p => ({ ...p, hoverImage: p.gallery?.[0] })));
          this._loaded.set(true);
          return;
        } catch { /* corrupt data — fall through to seed */ }
      }
    }

    // First run (or SSR): seed from the bundled JSON and persist so admin picks it up immediately.
    const seeded = (productsData as Product[]).map(p => ({ ...p, hoverImage: p.gallery?.[0] }));
    this._products.set(seeded);
    this._loaded.set(true);
    if (isPlatformBrowser(this.pid)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    }
  }

  private persist(): void {
    if (isPlatformBrowser(this.pid)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._products()));
    }
  }

  /* ── Lookups ─────────────────────────────────────────────────── */

  getProducts(): Product[] { return this._products(); }

  getById(id: number): Product | undefined {
    return this._products().find(p => p.id === id);
  }

  /* ── CRUD ────────────────────────────────────────────────────── */

  addProduct(data: Omit<Product, 'id'>): Product {
    const maxId   = this._products().reduce((m, p) => Math.max(m, p.id), 0);
    const product: Product = {
      ...(data as Product),
      id:         maxId + 1,
      hoverImage: (data as Product).gallery?.[0],
    };
    this._products.update(ps => [...ps, product]);
    this.persist();
    return product;
  }

  updateProduct(id: number, data: Partial<Product>): void {
    this._products.update(ps => ps.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...data };
      return { ...updated, hoverImage: updated.gallery?.[0] };
    }));
    this.persist();
  }

  deleteProduct(id: number): void {
    this._products.update(ps => ps.filter(p => p.id !== id));
    this.persist();
  }

  duplicateProduct(id: number): void {
    const p = this._products().find(x => x.id === id);
    if (!p) return;
    const { id: _, ...rest } = p;
    this.addProduct({ ...rest, name: `${rest.name} (Copy)` });
  }

  /* ── Export / Import ─────────────────────────────────────────── */

  exportProducts(): void {
    if (!isPlatformBrowser(this.pid)) return;
    const blob = new Blob([JSON.stringify(this._products(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'products.json' });
    a.click();
    URL.revokeObjectURL(url);
  }

  importProducts(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target!.result as string);
          if (!Array.isArray(data)) { reject(new Error('File must contain a JSON array of products.')); return; }
          this._products.set((data as Product[]).map(p => ({ ...p, hoverImage: p.gallery?.[0] })));
          this.persist();
          resolve();
        } catch {
          reject(new Error('Invalid JSON — could not parse the file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read the file.'));
      reader.readAsText(file);
    });
  }

  resetToDefault(): void {
    if (!isPlatformBrowser(this.pid)) return;
    const seeded = (productsData as Product[]).map(p => ({ ...p, hoverImage: p.gallery?.[0] }));
    this._products.set(seeded);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }
}
