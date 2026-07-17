import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import {
  InventoryVariant, StockMovement, MOVEMENT_TYPE_LABELS, MARKETPLACE_TYPES,
  StockMovementType, RECORDABLE_MOVEMENT_TYPES,
} from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

interface ColorGroup {
  color: string;
  variants: InventoryVariant[];
}

@Component({
  selector:    'app-inventory-detail',
  standalone:  true,
  imports:     [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './inventory-detail.component.html',
  styleUrl:    './inventory-detail.component.css',
})
export class InventoryDetailComponent implements OnInit {
  private readonly fb    = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly MOVEMENT_TYPE_LABELS = MOVEMENT_TYPE_LABELS;
  readonly RECORDABLE_MOVEMENT_TYPES = RECORDABLE_MOVEMENT_TYPES;

  productId = '';
  productName: string | null = null;
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

  // ── Inline "Record Movement" (any non-Purchase movement type) ─────────────
  readonly recordingVariantId = signal<string | null>(null);
  readonly recordMovementType = signal<StockMovementType>('ManualAdjustment');
  readonly recordQuantity     = signal<number | null>(null);
  readonly recordReason       = signal('');
  readonly recordBusy         = signal(false);
  readonly recordError        = signal<string | null>(null);

  /** StockCorrection asks for the counted total, not a delta — every other type asks for a quantity (Sale/Return/Damage: positive count; ManualAdjustment/Transfer: signed delta). */
  readonly quantityLabel = computed(() =>
    this.recordMovementType() === 'StockCorrection' ? 'Corrected Count' : 'Quantity',
  );

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
      this.error.set(err instanceof Error ? err.message : 'Could not load this product’s inventory.');
    } finally {
      this.loading.set(false);
    }
  }

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
        // Pricing starts blank — configured afterwards via the Pricing
        // Engine screen (see the "Pricing" link added per variant row).
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
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  isVariantInvalid(ctrl: string): boolean {
    const c = this.variantForm.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
