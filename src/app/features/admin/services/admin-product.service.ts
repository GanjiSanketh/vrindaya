import { Injectable, inject } from '@angular/core';
import { Product }             from '../../../core/models/product.model';
import { ProductStoreService } from '../../../core/services/product-store.service';

/**
 * Thin facade over ProductStoreService for admin components.
 * All state and logic live in ProductStoreService — this keeps
 * the admin API stable without duplicating any data.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private readonly store = inject(ProductStoreService);

  /* Signals forwarded from the store */
  readonly products         = this.store.products;
  readonly isLoaded         = this.store.isLoaded;
  readonly totalCount       = this.store.totalCount;
  readonly newArrivalsCount = this.store.newArrivalsCount;
  readonly trendingCount    = this.store.trendingCount;
  readonly bestSellersCount = this.store.bestSellersCount;

  getProducts(): Product[]                                { return this.store.getProducts(); }
  getById(id: number): Product | undefined                { return this.store.getById(id); }
  addProduct(data: Omit<Product, 'id'>): Product          { return this.store.addProduct(data); }
  updateProduct(id: number, data: Partial<Product>): void { this.store.updateProduct(id, data); }
  deleteProduct(id: number): void                         { this.store.deleteProduct(id); }
  duplicateProduct(id: number): void                      { this.store.duplicateProduct(id); }
  exportProducts(): void                                  { this.store.exportProducts(); }
  importProducts(file: File): Promise<void>               { return this.store.importProducts(file); }
  resetToDefault(): void                                  { this.store.resetToDefault(); }
}
