import { Component, inject, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { LIFECYCLE_STAGES, LifecycleStageValue } from '../../../../core/constants/lifecycle-stage.constants';
import { FlipkartOpsInput } from '../../../../core/models/product-api.model';

/** Per-product edit modal for every Flipkart Operations field — separate from the main product form (which only carries flipkartProductUrl/flipkartProductId). Saves via ProductApiService.updateFlipkartOps(). */
@Component({
  selector:    'app-flipkart-ops-edit-modal',
  standalone:  true,
  imports:     [ReactiveFormsModule, DatePipe],
  templateUrl: './flipkart-ops-edit-modal.component.html',
  styleUrl:    './flipkart-ops-edit-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlipkartOpsEditModalComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly api = inject(ProductApiService);

  readonly productId = input.required<string>();
  readonly closed     = output<void>();

  readonly stages = LIFECYCLE_STAGES;

  readonly saving    = signal(false);
  readonly formError = signal<string | null>(null);

  private discountTouched = false;
  private originalStage: LifecycleStageValue = 'Draft';

  readonly form = this.fb.group({
    flipkartProductUrl: [''],
    flipkartProductId:  [''],
    flipkartSellerSku:  [''],
    flipkartFsn:        [''],
    lifecycleStage:     ['Draft' as LifecycleStageValue],
    launchDate:         [''],
    lastSyncDate:       [''],
    marketplacePrice:   [null as number | null],
    marketplaceMrp:     [null as number | null],
    marketplaceDiscount:[null as number | null],
    marketplaceCategory:[''],
    marketplaceTags:    [''],
  });

  readonly clickCount = signal(0);
  readonly lastClickAt = signal<string | null>(null);

  constructor() {
    this.form.get('marketplacePrice')!.valueChanges.subscribe(() => this.recomputeDiscount());
    this.form.get('marketplaceMrp')!.valueChanges.subscribe(() => this.recomputeDiscount());
  }

  ngOnInit(): void {
    const p = this.api.products().find(x => x.id === this.productId());
    if (!p) { this.formError.set('Product not found.'); return; }

    this.form.patchValue({
      flipkartProductUrl: p.flipkartProductUrl ?? '',
      flipkartProductId:  p.flipkartProductId ?? '',
      flipkartSellerSku:  p.flipkartSellerSku ?? '',
      flipkartFsn:        p.flipkartFsn ?? '',
      lifecycleStage:     (p.lifecycleStage || 'Draft') as LifecycleStageValue,
      launchDate:         toDateInputValue(p.launchDate),
      lastSyncDate:       toDateInputValue(p.lastSyncDate),
      marketplacePrice:   p.marketplacePrice ?? null,
      marketplaceMrp:     p.marketplaceMrp ?? null,
      marketplaceDiscount: p.marketplaceDiscount ?? null,
      marketplaceCategory: p.marketplaceCategory ?? '',
      marketplaceTags:    (p.marketplaceTags ?? []).join(', '),
    }, { emitEvent: false });

    this.discountTouched = p.marketplaceDiscount != null;
    this.originalStage = (p.lifecycleStage || 'Draft') as LifecycleStageValue;
    this.clickCount.set(p.websiteClickCount ?? 0);
    this.lastClickAt.set(p.lastClickAt ?? null);
  }

  onDiscountInput(): void { this.discountTouched = true; }

  private recomputeDiscount(): void {
    if (this.discountTouched) return;
    const price = Number(this.form.value.marketplacePrice) || 0;
    const mrp   = Number(this.form.value.marketplaceMrp) || 0;
    if (mrp > 0) {
      const pct = Math.max(0, Math.min(100, Math.round((1 - price / mrp) * 100)));
      this.form.get('marketplaceDiscount')!.setValue(pct, { emitEvent: false });
    }
  }

  async submit(): Promise<void> {
    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();
    const payload: FlipkartOpsInput = {
      flipkartProductUrl: v.flipkartProductUrl?.trim() || undefined,
      flipkartProductId:  v.flipkartProductId?.trim() || undefined,
      flipkartSellerSku:  v.flipkartSellerSku?.trim() || undefined,
      flipkartFsn:        v.flipkartFsn?.trim() || undefined,
      launchDate:         v.launchDate ? new Date(v.launchDate).toISOString() : undefined,
      lastSyncDate:       v.lastSyncDate ? new Date(v.lastSyncDate).toISOString() : undefined,
      marketplacePrice:   v.marketplacePrice ?? undefined,
      marketplaceMrp:     v.marketplaceMrp ?? undefined,
      marketplaceDiscount: v.marketplaceDiscount ?? undefined,
      marketplaceCategory: v.marketplaceCategory?.trim() || undefined,
      marketplaceTags:    (v.marketplaceTags ?? '').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      // Two writes on one Save: Flipkart-specific fields go through
      // updateFlipkartOps(); the lifecycle stage is a separate concept
      // (Phase 8) owned by InventoryController/ILifecycleService, only
      // written if it actually changed.
      const stage = v.lifecycleStage || 'Draft';
      await Promise.all([
        this.api.updateFlipkartOps(this.productId(), payload),
        stage !== this.originalStage ? this.api.updateLifecycleStage(this.productId(), stage) : Promise.resolve(),
      ]);
      this.closed.emit();
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save Flipkart info.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void { this.closed.emit(); }
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
