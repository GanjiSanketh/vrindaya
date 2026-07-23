import { Component, inject, input, output, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { Product } from '../../../../core/models/product.model';

/**
 * Read-only slide-over shown when an admin clicks a product row — full
 * gallery, description, sizes, colors, specifications, SEO, and the
 * Flipkart link, without leaving the list (no navigation, no lost
 * filters/page/scroll position). Editing still happens on the full form.
 */
@Component({
  selector:    'app-product-preview-drawer',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './product-preview-drawer.component.html',
  styleUrl:    './product-preview-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPreviewDrawerComponent {
  private readonly api = inject(ProductApiService);

  readonly productId = input<string | null>(null);
  readonly closed     = output<void>();

  readonly BASE = `/${APP_ROUTES.ADMIN}`;

  readonly product = signal<Product | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);
  readonly activeImageIndex = signal(0);

  constructor() {
    effect(() => {
      const id = this.productId();
      this.activeImageIndex.set(0);
      if (id) {
        void this.load(id);
      } else {
        this.product.set(null);
      }
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const product = await this.api.getById(id);
      this.product.set(product);
      if (!product) this.error.set('Product not found.');
    } catch {
      this.error.set('Could not load this product.');
    } finally {
      this.loading.set(false);
    }
  }

  selectImage(index: number): void { this.activeImageIndex.set(index); }

  close(): void { this.closed.emit(); }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
