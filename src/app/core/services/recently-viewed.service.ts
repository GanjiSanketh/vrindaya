import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product.model';

const STORAGE_KEY = 'vrindaya_recently_viewed';
const MAX_ITEMS   = 8;

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly pid     = inject(PLATFORM_ID);
  private readonly _items  = signal<Product[]>(this.load());

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  track(product: Product): void {
    const current = this._items();
    const filtered = current.filter(p => p.id !== product.id);
    const updated  = [product, ...filtered].slice(0, MAX_ITEMS);
    this._items.set(updated);
    this.save(updated);
  }

  clear(): void {
    this._items.set([]);
    if (isPlatformBrowser(this.pid)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private load(): Product[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private save(items: Product[]): void {
    if (isPlatformBrowser(this.pid)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }
}
