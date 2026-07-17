import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { InventoryVariant, MarketplaceType, MARKETPLACE_TYPES } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

interface ComputedProfile {
  marketplaceType: MarketplaceType;
  suggestedSellingPrice: number;
  effectiveSellingPrice: number;
  totalCost: number;
  profitAmount: number;
  profitPercentage: number;
  margin: number;
  mrp: number;
  sellingPrice: number;
  closingFee: number;
  shippingCharge: number | null;
  packagingCharge: number | null;
  advertisementCost: number | null;
  miscellaneousCharges: number | null;
  expectedSettlement: number;
  netProfit: number;
  marginPercentage: number;
}

function computeProfile(
  purchaseCost: number, transportationCost: number, gstPercent: number,
  paymentGatewayChargePercent: number, desiredProfitPercent: number,
  marketplaceType: MarketplaceType, commissionPercent: number,
  manualSellingPriceOverride: number | null,
  mrp: number, sellingPrice: number, closingFee: number,
  shippingCharge: number | null, packagingCharge: number | null,
  advertisementCost: number | null, miscellaneousCharges: number | null,
): ComputedProfile {
  const flatCost = purchaseCost + transportationCost;
  const deductionFraction = (commissionPercent + paymentGatewayChargePercent + gstPercent) / 100;
  const profitFraction = desiredProfitPercent / 100;

  const suggestedSellingPrice = deductionFraction < 1
    ? (flatCost * (1 + profitFraction)) / (1 - deductionFraction)
    : flatCost;

  const effectiveSellingPrice = manualSellingPriceOverride ?? suggestedSellingPrice;
  const totalCost = flatCost + effectiveSellingPrice * deductionFraction;
  const profitAmount = effectiveSellingPrice - totalCost;

  const resolvedShipping = shippingCharge ?? 0;
  const resolvedPackaging = packagingCharge ?? 0;
  const resolvedAd = advertisementCost ?? 0;
  const resolvedMisc = miscellaneousCharges ?? 0;
  const perMktCosts = resolvedShipping + resolvedPackaging + resolvedAd + resolvedMisc;
  const commissionAmount = sellingPrice * commissionPercent / 100;
  const expectedSettlement = sellingPrice - commissionAmount - closingFee - perMktCosts;
  const netProfit = expectedSettlement - flatCost;

  return {
    marketplaceType,
    suggestedSellingPrice,
    effectiveSellingPrice,
    totalCost,
    profitAmount,
    profitPercentage: flatCost > 0 ? (profitAmount / flatCost) * 100 : 0,
    margin: effectiveSellingPrice > 0 ? (profitAmount / effectiveSellingPrice) * 100 : 0,
    mrp,
    sellingPrice,
    closingFee,
    shippingCharge,
    packagingCharge,
    advertisementCost,
    miscellaneousCharges,
    expectedSettlement,
    netProfit,
    marginPercentage: sellingPrice > 0 ? netProfit / sellingPrice * 100 : 0,
  };
}

@Component({
  selector:    'app-variant-pricing',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './variant-pricing.component.html',
  styleUrl:    './variant-pricing.component.css',
})
export class VariantPricingComponent implements OnInit {
  private readonly fb    = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  variantId = '';
  variant: InventoryVariant | null = null;

  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly formError = signal<string | null>(null);

  readonly computedProfiles = signal<ComputedProfile[]>([]);

  readonly form = this.fb.group({
    purchaseCost: [0, [Validators.required, Validators.min(0)]],
    transportationCost: [0, [Validators.required, Validators.min(0)]],
    packagingCost: [0, [Validators.required, Validators.min(0)]],
    advertisingCost: [0, [Validators.required, Validators.min(0)]],
    paymentGatewayChargePercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    shippingCost: [0, [Validators.required, Validators.min(0)]],
    gstPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    miscellaneousCost: [0, [Validators.required, Validators.min(0)]],
    desiredProfitPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    marketplaceProfiles: this.fb.array(
      MARKETPLACE_TYPES.map(marketplaceType => this.buildProfileGroup(marketplaceType)),
    ),
  });

  private buildProfileGroup(marketplaceType: MarketplaceType): FormGroup {
    return this.fb.group({
      marketplaceType: [marketplaceType],
      commissionPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      manualSellingPriceOverride: [null as number | null],
      mrp: [0, [Validators.min(0)]],
      sellingPrice: [0, [Validators.min(0)]],
      closingFee: [0, [Validators.min(0)]],
      shippingCharge: [null as number | null, [Validators.min(0)]],
      packagingCharge: [null as number | null, [Validators.min(0)]],
      advertisementCost: [null as number | null, [Validators.min(0)]],
      miscellaneousCharges: [null as number | null, [Validators.min(0)]],
    });
  }

  get profilesArray(): FormArray {
    return this.form.get('marketplaceProfiles') as FormArray;
  }

  constructor() {
    this.form.valueChanges.subscribe(() => this.recompute());
  }

  async ngOnInit(): Promise<void> {
    this.variantId = this.route.snapshot.paramMap.get('variantId') ?? '';
    this.loading.set(true);
    try {
      this.variant = await this.svc.getVariant(this.variantId);
      this.form.patchValue({
        purchaseCost: this.variant.purchaseCost,
        transportationCost: this.variant.transportationCost,
        packagingCost: this.variant.packagingCost,
        advertisingCost: this.variant.advertisingCost,
        paymentGatewayChargePercent: this.variant.paymentGatewayChargePercent,
        shippingCost: this.variant.shippingCost,
        gstPercent: this.variant.gstPercent,
        miscellaneousCost: this.variant.miscellaneousCost,
        desiredProfitPercent: this.variant.desiredProfitPercent,
      });
      for (const marketplaceType of MARKETPLACE_TYPES) {
        const existing = this.variant.marketplaceProfiles.find(p => p.marketplaceType === marketplaceType);
        const group = this.profilesArray.controls.find(c => c.value.marketplaceType === marketplaceType);
        if (existing && group) {
          group.patchValue({
            commissionPercent: existing.commissionPercent,
            manualSellingPriceOverride: existing.manualSellingPriceOverride,
            mrp: existing.mrp,
            sellingPrice: existing.sellingPrice,
            closingFee: existing.closingFee,
            shippingCharge: existing.shippingCharge,
            packagingCharge: existing.packagingCharge,
            advertisementCost: existing.advertisementCost,
            miscellaneousCharges: existing.miscellaneousCharges,
          }, { emitEvent: false });
        }
      }
      this.recompute();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this variant.');
    } finally {
      this.loading.set(false);
    }
  }

  private recompute(): void {
    const v = this.form.getRawValue();
    this.computedProfiles.set(
      (v.marketplaceProfiles ?? []).map((p: any) =>
        computeProfile(
          v.purchaseCost ?? 0, v.transportationCost ?? 0,
          v.gstPercent ?? 0, v.paymentGatewayChargePercent ?? 0, v.desiredProfitPercent ?? 0,
          p.marketplaceType, p.commissionPercent ?? 0, p.manualSellingPriceOverride,
          p.mrp ?? 0, p.sellingPrice ?? 0, p.closingFee ?? 0,
          p.shippingCharge, p.packagingCharge, p.advertisementCost, p.miscellaneousCharges,
        ),
      ),
    );
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.variant) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);
    const v = this.form.getRawValue();

    try {
      this.variant = await this.svc.upsertVariant(this.variant.productId, {
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
        marketplaceProfiles: (v.marketplaceProfiles ?? []).map((p: any) => ({
          marketplaceType: p.marketplaceType,
          commissionPercent: p.commissionPercent ?? 0,
          manualSellingPriceOverride: p.manualSellingPriceOverride,
          mrp: p.mrp ?? 0,
          sellingPrice: p.sellingPrice ?? 0,
          closingFee: p.closingFee ?? 0,
          shippingCharge: p.shippingCharge,
          packagingCharge: p.packagingCharge,
          advertisementCost: p.advertisementCost,
          miscellaneousCharges: p.miscellaneousCharges,
        })),
      });
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save pricing.');
    } finally {
      this.saving.set(false);
    }
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatPercent(value: number): string {
    return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
  }
}
