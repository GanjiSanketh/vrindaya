import { computed, Injectable, signal } from '@angular/core';
import { Product }                      from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class QuickViewService {
  private readonly _product = signal<Product | null>(null);

  readonly product = this._product.asReadonly();
  readonly isOpen  = computed(() => this._product() !== null);

  open(p: Product): void { this._product.set(p); }
  close(): void          { this._product.set(null); }
}
