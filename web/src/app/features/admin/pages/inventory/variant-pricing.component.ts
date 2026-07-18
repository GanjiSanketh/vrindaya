import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { InventoryService } from '../../services/inventory.service';
import { PricingService } from '../../services/pricing.service';
import { InventoryVariant } from '../../models/inventory.model';
import { CreatePricingRequest, UpdatePricingRequest } from '../../models/pricing.model';
import { PricingHistoryRow } from '../../models/pricing-history.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

const KNOWN_MARKETPLACES = ['Flipkart', 'Website', 'Amazon', 'Myntra', 'Ajio'];

interface ComputedValues {
  totalCost: number;
  suggestedSellingPrice: number;
  profit: number;
  marginPercent: number;
}

@Component({
  selector: 'app-variant-pricing',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './variant-pricing.component.html',
  styleUrl: './variant-pricing.component.css',
})
export class VariantPricingComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly invSvc = inject(InventoryService);
  private readonly priceSvc = inject(PricingService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly marketplaces = KNOWN_MARKETPLACES;
  variantId = '';
  variant: InventoryVariant | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal(0);
  readonly saving = signal(false);
  readonly savedSignal = signal(false);
  readonly formError = signal<string | null>(null);

  readonly sharedForm = this.fb.group({
    purchaseCost: [0, [Validators.required, Validators.min(0)]],
    transportationCost: [0, [Validators.required, Validators.min(0)]],
    packagingCost: [0, [Validators.required, Validators.min(0)]],
    advertisingCost: [0, [Validators.required, Validators.min(0)]],
    paymentGatewayChargePercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    shippingCost: [0, [Validators.required, Validators.min(0)]],
    gstPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    miscellaneousCost: [0, [Validators.required, Validators.min(0)]],
    desiredProfitPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  marketplaceForms: Record<string, FormGroup> = {};
  pricingRecordIds: Record<string, string | null> = {};
  private subs: Subscription[] = [];

  readonly activeComputed = signal<ComputedValues>({
    totalCost: 0,
    suggestedSellingPrice: 0,
    profit: 0,
    marginPercent: 0,
  });

  readonly showHistory = signal(false);
  readonly historyLoaded = signal(false);
  readonly loadingHistory = signal(false);
  readonly historyData = signal<PricingHistoryRow[]>([]);
  readonly historyCursor = signal<string | null>(null);
  readonly historyHasMore = signal(false);
  readonly historyFromDate = signal('');
  readonly historyToDate = signal('');

  private buildMktForm(): FormGroup {
    return this.fb.group({
      costPrice: [0, [Validators.required, Validators.min(0)]],
      packingCharge: [0, [Validators.required, Validators.min(0)]],
      shippingCharge: [0, [Validators.required, Validators.min(0)]],
      advertisingCharge: [0, [Validators.required, Validators.min(0)]],
      marketplaceCommission: [0, [Validators.required, Validators.min(0)]],
      fixedMarketplaceFee: [0, [Validators.required, Validators.min(0)]],
      paymentGatewayCharge: [0, [Validators.required, Validators.min(0)]],
      otherCharges: [0, [Validators.required, Validators.min(0)]],
      gstPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      desiredProfit: [0, [Validators.required, Validators.min(0)]],
      mrp: [0, [Validators.required, Validators.min(0)]],
      listingPrice: [0, [Validators.required, Validators.min(0)]],
      offerPrice: [null as number | null, [Validators.min(0)]],
      reason: ['', [Validators.maxLength(500)]],
    });
  }

  async ngOnInit(): Promise<void> {
    this.variantId = this.route.snapshot.paramMap.get('variantId') ?? '';
    this.loading.set(true);
    try {
      const [variant, pricingRows] = await Promise.all([
        this.invSvc.getVariant(this.variantId),
        this.priceSvc.getByVariant(this.variantId),
      ]);
      this.variant = variant;

      this.sharedForm.patchValue({
        purchaseCost: variant.purchaseCost,
        transportationCost: variant.transportationCost,
        packagingCost: variant.packagingCost,
        advertisingCost: variant.advertisingCost,
        paymentGatewayChargePercent: variant.paymentGatewayChargePercent,
        shippingCost: variant.shippingCost,
        gstPercent: variant.gstPercent,
        miscellaneousCost: variant.miscellaneousCost,
        desiredProfitPercent: variant.desiredProfitPercent,
      });

      const pricingMap: Record<string, (typeof pricingRows)[0]> = {};
      for (const row of pricingRows) {
        pricingMap[row.marketplace] = row;
      }

      for (const mkt of KNOWN_MARKETPLACES) {
        const form = this.buildMktForm();
        const existing = pricingMap[mkt];
        this.pricingRecordIds[mkt] = existing?.id ?? null;
        if (existing) {
          form.patchValue({
            costPrice: existing.costPrice,
            packingCharge: existing.packingCharge,
            shippingCharge: existing.shippingCharge,
            advertisingCharge: existing.advertisingCharge,
            marketplaceCommission: existing.marketplaceCommission,
            fixedMarketplaceFee: existing.fixedMarketplaceFee,
            paymentGatewayCharge: existing.paymentGatewayCharge,
            otherCharges: existing.otherCharges,
            gstPercentage: existing.gstPercentage,
            desiredProfit: existing.desiredProfit,
            mrp: existing.mrp,
            listingPrice: existing.listingPrice,
            offerPrice: existing.offerPrice,
          });
        }
        this.marketplaceForms[mkt] = form;
        this.subs.push(
          form.valueChanges.subscribe(() => this.recomputeActive()),
        );
      }

      this.recomputeActive();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load variant pricing.');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private recomputeActive(): void {
    const mkt = this.marketplaces[this.activeTab()];
    const form = this.marketplaceForms[mkt];
    if (!form) return;
    const v = form.getRawValue();
    const base = (v.costPrice ?? 0) + (v.packingCharge ?? 0) + (v.shippingCharge ?? 0)
      + (v.advertisingCharge ?? 0) + (v.marketplaceCommission ?? 0) + (v.fixedMarketplaceFee ?? 0)
      + (v.paymentGatewayCharge ?? 0) + (v.otherCharges ?? 0);
    const gstAmount = (v.costPrice ?? 0) * (v.gstPercentage ?? 0) / 100;
    const totalCost = this.r(base + gstAmount);
    const suggestedSellingPrice = this.r(totalCost + (v.desiredProfit ?? 0));
    const listingPrice = v.listingPrice ?? 0;
    const profit = this.r(listingPrice - totalCost);
    const marginPercent = listingPrice > 0 ? this.r(profit / listingPrice * 100) : 0;
    this.activeComputed.set({ totalCost, suggestedSellingPrice, profit, marginPercent });
  }

  setActiveTab(index: number): void {
    this.activeTab.set(index);
    this.recomputeActive();
    this.showHistory.set(false);
    this.historyLoaded.set(false);
  }

  async saveShared(): Promise<void> {
    if (this.sharedForm.invalid || !this.variant) { this.sharedForm.markAllAsTouched(); return; }
    this.formError.set(null);
    this.saving.set(true);
    const v = this.sharedForm.getRawValue();
    try {
      this.variant = await this.invSvc.upsertVariant(this.variant.productId, {
        color: this.variant.color,
        size: this.variant.size,
        sku: this.variant.sku,
        barcode: this.variant.barcode,
        qrCode: this.variant.qrCode,
        supplier: this.variant.supplier,
        warehouse: this.variant.warehouse,
        lowStockThreshold: this.variant.lowStockThreshold,
        criticalStockThreshold: this.variant.criticalStockThreshold,
        purchaseCost: v.purchaseCost ?? 0,
        transportationCost: v.transportationCost ?? 0,
        packagingCost: v.packagingCost ?? 0,
        advertisingCost: v.advertisingCost ?? 0,
        paymentGatewayChargePercent: v.paymentGatewayChargePercent ?? 0,
        shippingCost: v.shippingCost ?? 0,
        gstPercent: v.gstPercent ?? 0,
        miscellaneousCost: v.miscellaneousCost ?? 0,
        desiredProfitPercent: v.desiredProfitPercent ?? 0,
        marketplaceProfiles: this.variant.marketplaceProfiles.map(p => ({
          marketplaceType: p.marketplaceType,
          commissionPercent: p.commissionPercent,
          manualSellingPriceOverride: p.manualSellingPriceOverride,
          mrp: p.mrp,
          sellingPrice: p.sellingPrice,
          closingFee: p.closingFee,
          shippingCharge: p.shippingCharge,
          packagingCharge: p.packagingCharge,
          advertisementCost: p.advertisementCost,
          miscellaneousCharges: p.miscellaneousCharges,
        })),
      });
      this.savedSignal.set(true);
      setTimeout(() => this.savedSignal.set(false), 3000);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save shared costs.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveActiveMarketplace(): Promise<void> {
    const mkt = this.marketplaces[this.activeTab()];
    const form = this.marketplaceForms[mkt];
    if (form.invalid) { form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);
    const v = form.getRawValue();
    const id = this.pricingRecordIds[mkt];

    try {
      const payload: CreatePricingRequest = {
        inventoryVariantId: this.variantId,
        marketplace: mkt,
        costPrice: v.costPrice ?? 0,
        packingCharge: v.packingCharge ?? 0,
        shippingCharge: v.shippingCharge ?? 0,
        advertisingCharge: v.advertisingCharge ?? 0,
        marketplaceCommission: v.marketplaceCommission ?? 0,
        fixedMarketplaceFee: v.fixedMarketplaceFee ?? 0,
        paymentGatewayCharge: v.paymentGatewayCharge ?? 0,
        otherCharges: v.otherCharges ?? 0,
        gstPercentage: v.gstPercentage ?? 0,
        desiredProfit: v.desiredProfit ?? 0,
        mrp: v.mrp ?? 0,
        listingPrice: v.listingPrice ?? 0,
        offerPrice: v.offerPrice || null,
      };

      let result;
      if (id) {
        const updatePayload: UpdatePricingRequest = { ...payload, reason: v.reason || undefined };
        result = await this.priceSvc.update(id, updatePayload);
      } else {
        result = await this.priceSvc.create(payload);
        this.pricingRecordIds[mkt] = result.id;
      }
      form.patchValue({ reason: '' }, { emitEvent: false });
      this.savedSignal.set(true);
      setTimeout(() => this.savedSignal.set(false), 3000);
      if (this.showHistory() && id) {
        this.loadHistory(true);
      }
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : `Failed to save ${mkt} pricing.`);
    } finally {
      this.saving.set(false);
    }
  }

  async toggleHistory(): Promise<void> {
    this.showHistory.update(v => !v);
    if (this.showHistory() && !this.historyLoaded()) {
      await this.loadHistory();
    }
  }

  async loadHistory(refresh = false): Promise<void> {
    const pricingId = this.pricingRecordIds[this.marketplaces[this.activeTab()]];
    if (!pricingId) return;

    this.loadingHistory.set(true);
    if (refresh) {
      this.historyData.set([]);
      this.historyCursor.set(null);
      this.historyLoaded.set(false);
    }
    try {
      const result = await this.priceSvc.getHistory(pricingId, {
        fromDate: this.historyFromDate() || undefined,
        toDate: this.historyToDate() || undefined,
        cursor: refresh ? undefined : (this.historyCursor() ?? undefined),
        pageSize: 20,
      });
      if (refresh || !this.historyCursor()) {
        this.historyData.set(result.items);
      } else {
        this.historyData.update(items => [...items, ...result.items]);
      }
      this.historyCursor.set(result.nextCursor);
      this.historyHasMore.set(!!result.nextCursor);
      this.historyLoaded.set(true);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Could not load pricing history.');
    } finally {
      this.loadingHistory.set(false);
    }
  }

  async filterHistory(): Promise<void> {
    this.historyData.set([]);
    this.historyCursor.set(null);
    this.historyLoaded.set(false);
    await this.loadHistory();
  }

  async loadMoreHistory(): Promise<void> {
    await this.loadHistory();
  }

  private r(v: number): number {
    return Math.round(v * 100) / 100;
  }

  formatCurrency(value: number): string {
    return `\u20B9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
  }

  formatDateTime(value: string): string {
    const d = new Date(value);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
