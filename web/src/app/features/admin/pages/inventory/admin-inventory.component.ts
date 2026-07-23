import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductApiService, InventoryProductResponse, StockUpdateItem } from '../../../../core/services/product-api.service';

interface LocalVariant {
  variantId: string;
  colourName: string;
  colourHex: string | null;
  sizes: { size: string; stock: number }[];
  savedSizes: string;
  expanded: boolean;
  saving: boolean;
}
interface LocalProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  variants: LocalVariant[];
  expanded: boolean;
}

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-inventory.component.html',
  styleUrl: './admin-inventory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInventoryComponent {
  private readonly api = inject(ProductApiService);

  readonly products = signal<LocalProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  onStockInput(v: LocalVariant, size: string, value: string): void {
    const s = v.sizes.find(x => x.size === size);
    if (s) s.stock = Math.max(0, parseInt(value, 10) || 0);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data: InventoryProductResponse[] = await firstValueFrom(this.api.getInventory());
      this.products.set(data.map(p => ({
        productId: p.productId,
        productName: p.productName,
        productImage: p.productImage,
        expanded: false,
        variants: p.variants.map(v => ({
          variantId: v.variantId,
          colourName: v.colourName,
          colourHex: v.colourHex,
          expanded: false,
          saving: false,
          sizes: v.sizes.map(s => ({ size: s.size, stock: s.stock })),
          savedSizes: JSON.stringify(v.sizes.map(s => ({ size: s.size, stock: s.stock }))),
        })),
      })));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load inventory.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleProduct(id: string): void {
    this.products.update(list => list.map(p =>
      p.productId === id ? { ...p, expanded: !p.expanded } : p
    ));
  }

  toggleVariant(productId: string, variantId: string): void {
    this.products.update(list => list.map(p =>
      p.productId === productId
        ? {
            ...p,
            variants: p.variants.map(v =>
              v.variantId === variantId ? { ...v, expanded: !v.expanded } : v
            ),
          }
        : p
    ));
  }

  isDirty(variant: LocalVariant): boolean {
    return JSON.stringify(variant.sizes) !== variant.savedSizes;
  }

  async saveVariantStock(product: LocalProduct, variant: LocalVariant): Promise<void> {
    if (!this.isDirty(variant) || variant.saving) return;
    variant.saving = true;
    try {
      const updates: StockUpdateItem[] = [{
        productId: product.productId,
        variantId: variant.variantId,
        sizes: variant.sizes.map(s => ({ size: s.size, stock: s.stock })),
      }];
      await firstValueFrom(this.api.updateStock(updates));
      variant.savedSizes = JSON.stringify(variant.sizes);
    } catch {
      // ignore
    } finally {
      variant.saving = false;
    }
  }

}
