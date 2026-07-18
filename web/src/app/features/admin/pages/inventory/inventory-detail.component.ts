import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { PricingService } from '../../services/pricing.service';
import {
  InventoryVariant, StockMovement, MOVEMENT_TYPE_LABELS, MARKETPLACE_TYPES,
  StockMovementType, RECORDABLE_MOVEMENT_TYPES,
} from '../../models/inventory.model';
import {
  ProductPricingSummaryRow, BulkPricingUpdateRequest,
  BulkOperation, PricingPreviewItem,
} from '../../models/pricing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

type Tab = 'variants' | 'pricing';

interface ColorGroup {
  color: string;
  variants: InventoryVariant[];
}

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.css',
})
export class InventoryDetailComponent implements OnInit {
  private readonly fb    = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);
  private readonly priceSvc = inject(PricingService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly MOVEMENT_TYPE_LABELS = MOVEMENT_TYPE_LABELS;
  readonly RECORDABLE_MOVEMENT_TYPES = RECORDABLE_MOVEMENT_TYPES;

  productId = '';
  productName: string | null = null;
  readonly activeTab = signal<Tab>('variants');

  readonly variants  = signal<InventoryVariant[]>([]);
  readonly movements = signal<StockMovement[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  readonly colorGroups = computed<ColorGroup[]>(() => {
    const byColor = new Map<string, InventoryVariant[]>();
    for (const v of this.variants()) {
      const list = byColor.get(v.color) ?? [];
      list.push(v);
      byColor.set(v.color, list);
    }
    return [...byColor.entries()].map(([color, variants]) => ({ color, variants }));
  });

  // ── Add variant ──────────────────────────────────────────────────────────
  readonly addingVariant = signal(false);
  readonly variantFormError = signal<string | null>(null);
  readonly variantForm = this.fb.group({
    color: ['', Validators.required],
    size: ['', Validators.required],
    barcode: [''],
    lowStockThreshold: [5, [Validators.required, Validators.min(0)]],
    criticalStockThreshold: [2, [Validators.required, Validators.min(0)]],
  });

  // ── Inline "Record Movement" ─────────────────────────────────────────────
  readonly recordingVariantId = signal<string | null>(null);
  readonly recordMovementType = signal<StockMovementType>('ManualAdjustment');
  readonly recordQuantity     = signal<number | null>(null);
  readonly recordReason       = signal('');
  readonly recordBusy         = signal(false);
  readonly recordError        = signal<string | null>(null);

  readonly quantityLabel = computed(() =>
    this.recordMovementType() === 'StockCorrection' ? 'Corrected Count' : 'Quantity',
  );

  // ── Pricing tab ──────────────────────────────────────────────────────────
  readonly pricingData = signal<ProductPricingSummaryRow[]>([]);
  readonly pricingLoading = signal(false);
  readonly pricingRecalculating = signal<Set<string>>(new Set());

  // ── Bulk update ──────────────────────────────────────────────────────────
  readonly selectedPricingIds = signal<Set<string>>(new Set());
  readonly showBulkUpdate = signal(false);
  readonly bulkPackingEnabled = signal(false);
  readonly bulkAdvEnabled = signal(false);
  readonly bulkProfitEnabled = signal(false);
  readonly bulkCommissionEnabled = signal(false);
  readonly bulkOperation = signal<BulkOperation>('IncreasePercent');
  readonly bulkValue = signal(0);
  readonly bulkPreviewData = signal<PricingPreviewItem[] | null>(null);
  readonly bulkPreviewLoading = signal(false);
  readonly bulkApplying = signal(false);
  readonly bulkError = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedPricingIds().size);

  async ngOnInit(): Promise<void> {
    this.productId = this.route.snapshot.paramMap.get('productId') ?? '';
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.variants.set(await this.svc.getVariantsByProduct(this.productId));
      this.productName = this.variants()[0]?.productName ?? null;

      const page = await this.svc.getMovements(null, 10, { productId: this.productId });
      this.movements.set(page.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this product\u2019s inventory.');
    } finally {
      this.loading.set(false);
    }
  }

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'pricing' && this.pricingData().length === 0 && !this.pricingLoading()) {
      this.loadPricing();
    }
  }

  private async loadPricing(): Promise<void> {
    this.pricingLoading.set(true);
    try {
      this.pricingData.set(await this.priceSvc.getProductPricing(this.productId));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load pricing data.');
    } finally {
      this.pricingLoading.set(false);
    }
  }

  async recalculate(pricingId: string): Promise<void> {
    this.pricingRecalculating.update(s => new Set(s).add(pricingId));
    try {
      await this.priceSvc.recalculate(pricingId);
      this.pricingData.update(rows =>
        rows.map(r => r.pricingId === pricingId ? { ...r, isOutdated: false } : r),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to recalculate.');
    } finally {
      this.pricingRecalculating.update(s => { const next = new Set(s); next.delete(pricingId); return next; });
    }
  }

  // ── Bulk update actions ──────────────────────────────────────────────────

  toggleSelectPricing(pricingId: string): void {
    this.selectedPricingIds.update(s => {
      const next = new Set(s);
      if (next.has(pricingId)) next.delete(pricingId); else next.add(pricingId);
      return next;
    });
  }

  toggleSelectAll(): void {
    this.selectedPricingIds.update(s => {
      if (s.size === this.pricingData().length) return new Set();
      return new Set(this.pricingData().map(r => r.pricingId));
    });
  }

  openBulkUpdate(): void {
    this.showBulkUpdate.set(true);
    this.bulkPreviewData.set(null);
    this.bulkError.set(null);
  }

  closeBulkUpdate(): void {
    this.showBulkUpdate.set(false);
    this.bulkPreviewData.set(null);
    this.bulkError.set(null);
  }

  private buildBulkRequest(): BulkPricingUpdateRequest {
    const req: BulkPricingUpdateRequest = { pricingIds: [...this.selectedPricingIds()] };
    const op = this.bulkOperation();
    const val = this.bulkValue();
    if (this.bulkPackingEnabled()) req.packingCharge = { operation: op, value: val };
    if (this.bulkAdvEnabled()) req.advertisingCharge = { operation: op, value: val };
    if (this.bulkProfitEnabled()) req.desiredProfit = { operation: op, value: val };
    if (this.bulkCommissionEnabled()) req.marketplaceCommission = { operation: op, value: val };
    return req;
  }

  async previewBulkUpdate(): Promise<void> {
    if (this.selectedPricingIds().size === 0) return;
    this.bulkError.set(null);
    this.bulkPreviewLoading.set(true);
    this.bulkPreviewData.set(null);
    try {
      const result = await this.priceSvc.bulkPreview(this.buildBulkRequest());
      this.bulkPreviewData.set(result.items);
    } catch (err) {
      this.bulkError.set(err instanceof Error ? err.message : 'Preview failed.');
    } finally {
      this.bulkPreviewLoading.set(false);
    }
  }

  async applyBulkUpdate(): Promise<void> {
    this.bulkError.set(null);
    this.bulkApplying.set(true);
    try {
      await this.priceSvc.bulkApply(this.buildBulkRequest());
      this.closeBulkUpdate();
      this.selectedPricingIds.set(new Set());
      await this.loadPricing();
    } catch (err) {
      this.bulkError.set(err instanceof Error ? err.message : 'Apply failed.');
    } finally {
      this.bulkApplying.set(false);
    }
  }

  // ── Form actions ─────────────────────────────────────────────────────────
  startAddVariant(): void {
    this.addingVariant.set(true);
    this.variantFormError.set(null);
    this.variantForm.reset({ color: '', size: '', barcode: '', lowStockThreshold: 5, criticalStockThreshold: 2 });
  }

  cancelAddVariant(): void {
    this.addingVariant.set(false);
  }

  async submitVariant(): Promise<void> {
    if (this.variantForm.invalid) { this.variantForm.markAllAsTouched(); return; }

    this.variantFormError.set(null);
    const v = this.variantForm.getRawValue();

    if (Number(v.criticalStockThreshold) > Number(v.lowStockThreshold)) {
      this.variantFormError.set('Critical stock threshold cannot be greater than the low stock threshold.');
      return;
    }

    try {
      await this.svc.upsertVariant(this.productId, {
        color: v.color!.trim(),
        size: v.size!.trim(),
        sku: '',
        barcode: v.barcode?.trim() || null,
        qrCode: null,
        supplier: null,
        warehouse: null,
        lowStockThreshold: Number(v.lowStockThreshold) || 0,
        criticalStockThreshold: Number(v.criticalStockThreshold) || 0,
        purchaseCost: 0,
        transportationCost: 0,
        packagingCost: 0,
        advertisingCost: 0,
        paymentGatewayChargePercent: 0,
        shippingCost: 0,
        gstPercent: 0,
        miscellaneousCost: 0,
        desiredProfitPercent: 0,
        marketplaceProfiles: MARKETPLACE_TYPES.map(marketplaceType => ({
          marketplaceType,
          commissionPercent: 0,
          manualSellingPriceOverride: null,
          mrp: 0,
          sellingPrice: 0,
          closingFee: 0,
          shippingCharge: null,
          packagingCharge: null,
          advertisementCost: null,
          miscellaneousCharges: null,
        })),
      });
      this.addingVariant.set(false);
      this.variants.set(await this.svc.getVariantsByProduct(this.productId));
    } catch (err) {
      this.variantFormError.set(err instanceof Error ? err.message : 'Failed to save variant.');
    }
  }

  startRecordMovement(variant: InventoryVariant): void {
    this.recordingVariantId.set(variant.id);
    this.recordMovementType.set('ManualAdjustment');
    this.recordQuantity.set(null);
    this.recordReason.set('');
    this.recordError.set(null);
  }

  cancelRecordMovement(): void {
    this.recordingVariantId.set(null);
  }

  async submitRecordMovement(variantId: string): Promise<void> {
    const quantity = this.recordQuantity();
    const reason = this.recordReason().trim();
    const movementType = this.recordMovementType();
    if (!quantity || !reason) {
      this.recordError.set(`Enter a ${this.quantityLabel().toLowerCase()} and a reason.`);
      return;
    }

    this.recordBusy.set(true);
    this.recordError.set(null);
    try {
      const updated = await this.svc.recordMovement(variantId, {
        movementType,
        reason,
        ...(movementType === 'StockCorrection' ? { newQuantity: quantity } : { quantity }),
      });
      this.variants.update(list => list.map(v => (v.id === updated.id ? updated : v)));
      this.recordingVariantId.set(null);
      const page = await this.svc.getMovements(null, 10, { productId: this.productId });
      this.movements.set(page.items);
    } catch (err) {
      this.recordError.set(err instanceof Error ? err.message : 'Failed to record movement.');
    } finally {
      this.recordBusy.set(false);
    }
  }

  formatCurrency(value: number): string {
    return `\u20B9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  isVariantInvalid(ctrl: string): boolean {
    const c = this.variantForm.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
