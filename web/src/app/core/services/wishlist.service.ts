import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly KEY  = 'vrindaya_wishlist';
  /**
   * Product ids are Firestore string doc-ids as of the Firestore product
   * migration — pre-migration entries here were numeric and simply won't
   * match anything post-migration (silently ignored, not an error).
   */
  private readonly _ids = signal<string[]>(this.load());

  readonly ids   = this._ids.asReadonly();
  readonly count = computed(() => this._ids().length);

  toggle(productId: string, event?: Event): void {
    event?.stopPropagation();
    const current = this._ids();
    const updated = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    this._ids.set(updated);
    this.save(updated);
  }

  has(productId: string): boolean {
    return this._ids().includes(productId);
  }

  private load(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(this.KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
  }

  private save(ids: string[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.KEY, JSON.stringify(ids));
    }
  }
}
