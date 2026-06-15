import { Component, inject, OnInit }        from '@angular/core';
import { FormBuilder, ReactiveFormsModule,
         Validators }                        from '@angular/forms';
import { HttpClient }                        from '@angular/common/http';
import { RouterLink }                        from '@angular/router';
import { DecimalPipe }                       from '@angular/common';
import { catchError, of }                    from 'rxjs';

import { PopupService }                      from '../../../services/popup.service';
import { PopupConfig, TriggerType,
         CampaignType }                      from '../../../models/popup.model';
import { Product }                           from '../../../models/product.model';

@Component({
  selector:    'app-popup-config',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './popup-config.component.html',
  styleUrl:    './popup-config.component.css',
})
export class PopupConfigComponent implements OnInit {
  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(PopupService);
  private readonly http = inject(HttpClient);

  products:     Product[] = [];
  saveSuccess   = false;
  resetSuccess  = false;
  configPreview = '';

  readonly triggerOptions: { value: TriggerType; label: string; hint: string }[] = [
    { value: 'SCROLL_OR_TIME', label: 'Scroll OR Time (recommended)', hint: 'Whichever fires first' },
    { value: 'TIME_ONLY',      label: 'Time only',                    hint: 'Fixed delay after page load' },
    { value: 'SCROLL_ONLY',    label: 'Scroll only',                  hint: 'Fires at scroll depth' },
  ];

  readonly campaignOptions: { value: CampaignType; label: string; hint: string }[] = [
    { value: 'NEW_ARRIVAL',     label: 'New Arrival',     hint: 'First product marked isNew' },
    { value: 'TRENDING',        label: 'Trending',        hint: 'First product marked isTrending' },
    { value: 'BEST_SELLER',     label: 'Best Seller',     hint: 'First product marked isBestSeller' },
    { value: 'FESTIVE_SALE',    label: 'Festive Sale',    hint: 'Highest-discount product' },
    { value: 'MANUAL_PRODUCT',  label: 'Manual Product',  hint: 'Pick a specific product below' },
  ];

  form = this.fb.group({
    enabled:            [true],
    campaignType:       ['NEW_ARRIVAL' as CampaignType, Validators.required],
    productId:          [11,                            Validators.required],
    title:              ['New Arrival',       [Validators.required, Validators.maxLength(60)]],
    subtitle:           ['Limited Time Offer',[Validators.required, Validators.maxLength(80)]],
    triggerType:        ['SCROLL_OR_TIME' as TriggerType, Validators.required],
    scrollPercentage:   [30,  [Validators.required, Validators.min(5), Validators.max(90)]],
    timeDelaySeconds:   [8,   [Validators.required, Validators.min(0), Validators.max(60)]],
    showOncePerSession: [true],
  });

  ngOnInit(): void {
    this.products = this.svc.allProducts;
    this.loadCurrentConfig();
  }

  isManualProduct(): boolean {
    return this.form.value.campaignType === 'MANUAL_PRODUCT';
  }

  showScrollField(): boolean {
    const t = this.form.value.triggerType;
    return t === 'SCROLL_OR_TIME' || t === 'SCROLL_ONLY';
  }

  showTimeField(): boolean {
    const t = this.form.value.triggerType;
    return t === 'SCROLL_OR_TIME' || t === 'TIME_ONLY';
  }

  getCampaignHint(): string {
    return this.campaignOptions.find(o => o.value === this.form.value.campaignType)?.hint ?? '';
  }

  getCampaignProduct(): Product | undefined {
    const type = this.form.value.campaignType as CampaignType;
    switch (type) {
      case 'TRENDING':     return this.products.find(p => p.isTrending);
      case 'NEW_ARRIVAL':  return this.products.find(p => p.isNew);
      case 'BEST_SELLER':  return this.products.find(p => p.isBestSeller || p.isBestseller);
      case 'FESTIVE_SALE': return [...this.products].sort((a, b) => b.discount - a.discount)[0];
      default:             return this.products.find(p => p.id === Number(this.form.value.productId));
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const config: PopupConfig = {
      enabled:            !!this.form.value.enabled,
      campaignType:       this.form.value.campaignType as CampaignType,
      productId:          Number(this.form.value.productId),
      title:              this.form.value.title!,
      subtitle:           this.form.value.subtitle!,
      triggerType:        this.form.value.triggerType as TriggerType,
      scrollPercentage:   Number(this.form.value.scrollPercentage),
      timeDelaySeconds:   Number(this.form.value.timeDelaySeconds),
      showOncePerSession: !!this.form.value.showOncePerSession,
    };

    this.svc.saveConfig(config);
    this.configPreview = JSON.stringify(config, null, 2);
    this.saveSuccess   = true;
    setTimeout(() => (this.saveSuccess = false), 3500);
  }

  resetToFile(): void {
    this.svc.resetToFile();
    this.configPreview = '';
    this.loadCurrentConfig();
    this.resetSuccess  = true;
    setTimeout(() => (this.resetSuccess = false), 3500);
  }

  private loadCurrentConfig(): void {
    const local = this.svc.getLocalConfig();
    if (local) { this.patchForm(local); return; }

    this.http
      .get<PopupConfig>('assets/config/popup-config.json')
      .pipe(catchError(() => of(null)))
      .subscribe(cfg => { if (cfg) this.patchForm(cfg); });
  }

  private patchForm(cfg: PopupConfig): void {
    this.form.patchValue({
      ...cfg,
      // Migrate legacy showDelay (ms) → timeDelaySeconds
      timeDelaySeconds: cfg.timeDelaySeconds ??
                        (cfg.showDelay != null ? cfg.showDelay / 1_000 : 8),
    });
  }
}
