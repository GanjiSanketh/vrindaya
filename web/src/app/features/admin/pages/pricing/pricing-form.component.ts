import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { PricingService } from '../../services/pricing.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { CreatePricingRequest, UpdatePricingRequest } from '../../models/pricing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-pricing-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './pricing-form.component.html',
  styleUrl:    './pricing-form.component.css',
})
export class PricingFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly svc    = inject(PricingService);
  private readonly auth   = inject(AdminAuthService);
  private readonly toast  = inject(ToastService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory/pricing`;
  readonly canEdit = this.auth.hasRole(['SuperAdmin', 'Admin']);

  readonly isEdit    = signal(false);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly formError = signal<string | null>(null);
  private pricingId = '';

  readonly form = this.fb.group({
    inventoryVariantId: ['', Validators.required],
    marketplace: ['Website', Validators.required],
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
    offerPrice: [0, [Validators.min(0)]],
    currency: ['INR', Validators.maxLength(3)],
    isActive: [true],
  });

  private get f() { return this.form.getRawValue(); }

  readonly totalCost = computed(() => {
    const v = this.f;
    const base = (v.costPrice ?? 0) + (v.packingCharge ?? 0) + (v.shippingCharge ?? 0)
      + (v.advertisingCharge ?? 0) + (v.marketplaceCommission ?? 0) + (v.fixedMarketplaceFee ?? 0)
      + (v.paymentGatewayCharge ?? 0) + (v.otherCharges ?? 0);
    const gstAmount = (v.costPrice ?? 0) * (v.gstPercentage ?? 0) / 100;
    return this.r(base + gstAmount);
  });

  readonly suggestedSellingPrice = computed(() =>
    this.r(this.totalCost() + (this.f.desiredProfit ?? 0))
  );

  readonly profit = computed(() =>
    this.r((this.f.listingPrice ?? 0) - this.totalCost())
  );

  readonly marginPercent = computed(() => {
    const lp = this.f.listingPrice ?? 0;
    return lp <= 0 ? 0 : this.r(this.profit() / lp * 100);
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const variantParam = this.route.snapshot.queryParamMap.get('variantId');

    if (!this.canEdit) {
      this.toast.error('You do not have permission to modify pricing records.');
      await this.router.navigate([this.BASE]);
      return;
    }

    if (variantParam) {
      this.form.patchValue({ inventoryVariantId: variantParam });
    }

    if (!idParam) return;

    this.isEdit.set(true);
    this.pricingId = idParam;
    this.loading.set(true);
    try {
      const row = await this.svc.getOne(this.pricingId);
      this.form.patchValue({ ...row, offerPrice: row.offerPrice ?? 0 });
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to load pricing record.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);
    const v = this.f;

    const payload: CreatePricingRequest = {
      inventoryVariantId: (v.inventoryVariantId ?? '').trim(),
      marketplace: v.marketplace ?? 'Website',
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
      currency: v.currency || 'INR',
      isActive: v.isActive ?? true,
    };

    try {
      if (this.isEdit()) {
        await this.svc.update(this.pricingId, payload as unknown as UpdatePricingRequest);
        this.toast.success('Pricing record updated successfully.');
      } else {
        await this.svc.create(payload);
        this.toast.success('Pricing record created successfully.');
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save pricing record.');
      this.saving.set(false);
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  formatCurrency(value: number): string {
    return `\u20B9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  private r(v: number): number {
    return Math.round(v * 100) / 100;
  }
}
