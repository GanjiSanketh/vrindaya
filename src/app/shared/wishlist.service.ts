import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly KEY = 'vrindaya_wishlist';
  private readonly _ids = signal<number[]>(this.load());

  readonly ids = this._ids.asReadonly();

  toggle(productId: number, event?: Event): void {
    event?.stopPropagation();
    const current = this._ids();
    const updated = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    this._ids.set(updated);
    this.save(updated);
  }

  has(productId: number): boolean {
    return this._ids().includes(productId);
  }

  private load(): number[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(this.KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private save(ids: number[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.KEY, JSON.stringify(ids));
    }
  }
}
