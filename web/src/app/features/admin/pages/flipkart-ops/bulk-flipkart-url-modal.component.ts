import { Component, inject, input, output, signal, OnInit, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { ProductApiService } from '../../../../core/services/product-api.service';

interface UrlRow {
  id: string;
  name: string;
  sku: string;
  flipkartProductUrl: string;
  flipkartSellerSku: string;
}

/**
 * "Bulk Update URLs" — unlike the other bulk actions, URLs (and seller
 * SKUs) are unique per product, so this pre-populates one editable row per
 * selected product from its current values rather than applying a single
 * shared value to everything.
 */
@Component({
  selector:    'app-bulk-flipkart-url-modal',
  standalone:  true,
  templateUrl: './bulk-flipkart-url-modal.component.html',
  styleUrl:    './bulk-flipkart-url-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkFlipkartUrlModalComponent implements OnInit {
  private readonly api = inject(ProductApiService);

  readonly productIds = input.required<string[]>();
  readonly closed      = output<void>();

  readonly rows   = signal<UrlRow[]>([]);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  ngOnInit(): void {
    const byId = new Map(this.api.products().map(p => [p.id, p]));
    this.rows.set(
      this.productIds()
        .map(id => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          flipkartProductUrl: p.flipkartProductUrl ?? '',
          flipkartSellerSku: p.flipkartSellerSku ?? '',
        })),
    );
  }

  updateUrl(id: string, value: string): void {
    this.rows.update(list => list.map(r => r.id === id ? { ...r, flipkartProductUrl: value } : r));
  }

  updateSku(id: string, value: string): void {
    this.rows.update(list => list.map(r => r.id === id ? { ...r, flipkartSellerSku: value } : r));
  }

  async saveAll(): Promise<void> {
    this.formError.set(null);
    this.saving.set(true);
    try {
      await this.api.bulkUpdateFlipkartUrls(
        this.rows().map(r => ({
          id: r.id,
          flipkartProductUrl: r.flipkartProductUrl.trim() || undefined,
          flipkartSellerSku: r.flipkartSellerSku.trim() || undefined,
        })),
      );
      this.closed.emit();
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save URLs.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void { this.closed.emit(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancel(); }

  trackById(_: number, r: UrlRow): string { return r.id; }
}
