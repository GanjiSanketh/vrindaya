import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FlipkartSettingsService } from '../../../../core/services/flipkart-settings.service';

@Component({
  selector: 'app-flipkart-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './flipkart-settings.component.html',
  styleUrl: './flipkart-settings.component.css',
})
export class FlipkartSettingsComponent implements OnInit {
  private readonly svc = inject(FlipkartSettingsService);
  private readonly fb  = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving  = signal(false);
  readonly saved   = signal(false);
  readonly error   = signal<string | null>(null);

  readonly form = this.fb.group({
    marketplaceEnabled: [false],
    sellerDisplayName: [''],
    sellerId: [''],
    defaultShippingCharge: [0],
    defaultPackagingCharge: [0],
    defaultAdvertisementPercentage: [0],
    defaultFlipkartCommissionPercentage: [0],
    defaultPaymentGatewayCharges: [0],
    defaultMiscellaneousCharges: [0],
    gstPercentage: [0],
    defaultProfitMargin: [0],
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const settings = await this.svc.getSettings();
      this.form.patchValue({
        marketplaceEnabled: settings.marketplaceEnabled,
        sellerDisplayName: settings.sellerDisplayName,
        sellerId: settings.sellerId,
        defaultShippingCharge: settings.defaultShippingCharge,
        defaultPackagingCharge: settings.defaultPackagingCharge,
        defaultAdvertisementPercentage: settings.defaultAdvertisementPercentage,
        defaultFlipkartCommissionPercentage: settings.defaultFlipkartCommissionPercentage,
        defaultPaymentGatewayCharges: settings.defaultPaymentGatewayCharges,
        defaultMiscellaneousCharges: settings.defaultMiscellaneousCharges,
        gstPercentage: settings.gstPercentage,
        defaultProfitMargin: settings.defaultProfitMargin,
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load Flipkart settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const v = this.form.getRawValue();
    try {
      await this.svc.updateSettings({
        marketplaceEnabled: !!v.marketplaceEnabled,
        sellerDisplayName: v.sellerDisplayName?.trim() || '',
        sellerId: v.sellerId?.trim() || '',
        defaultShippingCharge: v.defaultShippingCharge ?? 0,
        defaultPackagingCharge: v.defaultPackagingCharge ?? 0,
        defaultAdvertisementPercentage: v.defaultAdvertisementPercentage ?? 0,
        defaultFlipkartCommissionPercentage: v.defaultFlipkartCommissionPercentage ?? 0,
        defaultPaymentGatewayCharges: v.defaultPaymentGatewayCharges ?? 0,
        defaultMiscellaneousCharges: v.defaultMiscellaneousCharges ?? 0,
        gstPercentage: v.gstPercentage ?? 0,
        defaultProfitMargin: v.defaultProfitMargin ?? 0,
      });
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save Flipkart settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
