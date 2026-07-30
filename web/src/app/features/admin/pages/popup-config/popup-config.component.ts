import { Component, inject, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient }                                  from '@angular/common/http';
import { RouterLink }                                  from '@angular/router';
import { catchError, of }                              from 'rxjs';
import { takeUntilDestroyed }                          from '@angular/core/rxjs-interop';

import { PopupService }                                from '../../../../core/services/popup.service';
import { ProductApiService }                           from '../../../../core/services/product-api.service';
import { PopupConfig, TriggerType, CampaignType }      from '../../../../core/models/popup.model';
import { Product }                                     from '../../../../core/models/product.model';

@Component({
  selector:    'app-popup-config',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './popup-config.component.html',
  styleUrl:    './popup-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupConfigComponent implements OnInit {
  private readonly fb        = inject(FormBuilder);
  private readonly svc       = inject(PopupService);
  private readonly http      = inject(HttpClient);
  private readonly productApi = inject(ProductApiService);

  /** Admin's full catalog (not just active/public-eligible products) — this picker needs to find ANY product, including drafts, for the MANUAL_PRODUCT campaign type. */
  get products(): Product[] { return this.productApi.products(); }

  saveSuccess   = false;
  resetSuccess  = false;
  configPreview = '';

  readonly triggerOptions: { value: TriggerType; label: string; hint: string }[] = [
    { value: 'SCROLL_OR_TIME', label: 'Scroll OR Time (recommended)', hint: 'Whichever fires first' },
    { value: 'TIME_ONLY',      label: 'Time only',                    hint: 'Fixed delay after page load' },
    { value: 'SCROLL_ONLY',    label: 'Scroll only',                  hint: 'Fires at scroll depth' },
  ];

  readonly campaignOptions: { value: CampaignType; label: string; hint: string }[] = [
    { value: 'NEW_ARRIVAL',    label: 'New Arrival',    hint: 'First product marked isNew' },
    { value: 'TRENDING',       label: 'Trending',       hint: 'First product marked isTrending' },
    { value: 'BEST_SELLER',    label: 'Best Seller',    hint: 'First product marked isBestSeller' },
    { value: 'MANUAL_PRODUCT', label: 'Manual Product', hint: 'Pick a specific product below' },
  ];

  form = this.fb.group({
    enabled:            [true],
    campaignType:       ['NEW_ARRIVAL' as CampaignType, Validators.required],
    productId:          ['', Validators.required],
    title:              ['New Arrival',        [Validators.required, Validators.maxLength(60)]],
    subtitle:           ['Limited Time Offer', [Validators.required, Validators.maxLength(80)]],
    triggerType:        ['SCROLL_OR_TIME' as TriggerType, Validators.required],
    scrollPercentage:   [30, [Validators.required, Validators.min(5), Validators.max(90)]],
    timeDelaySeconds:   [8,  [Validators.required, Validators.min(0), Validators.max(60)]],
    showOncePerSession: [true],
  });

  ngOnInit(): void {
    void this.productApi.ensureLoaded();
    this.loadCurrentConfig();
  }

readonly isManualProduct = computed(() => this.form.value.campaignType === 'MANUAL_PRODUCT');

readonly showScrollField = computed(() => {
    const t = this.form.value.triggerType;
    return t === 'SCROLL_OR_TIME' || t === 'SCROLL_ONLY';
  });

readonly showTimeField = computed(() => {
    const t = this.form.value.triggerType;
    return t === 'SCROLL_OR_TIME' || t === 'TIME_ONLY';
  });

readonly getCampaignHint = computed(() => {
    return this.campaignOptions.find(o => o.value === this.form.value.campaignType)?.hint ?? '';
  });

readonly campaignProduct = computed(() => {
    const type = this.form.value.campaignType as CampaignType;
    switch (type) {
      case 'TRENDING':     return this.products.find(p => p.isTrending);
      case 'NEW_ARRIVAL':  return this.products.find(p => p.isNew);
      case 'BEST_SELLER':  return this.products.find(p => p.isBestSeller);
      default:             return this.products.find(p => p.id === this.form.value.productId);
    }
  });

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const config: PopupConfig = {
      enabled:            !!this.form.value.enabled,
      campaignType:       this.form.value.campaignType as CampaignType,
      productId:          this.form.value.productId!,
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
      .pipe(catchError(() => of(null)), takeUntilDestroyed())
      .subscribe(cfg => { if (cfg) this.patchForm(cfg); });
  }

  private patchForm(cfg: PopupConfig): void {
    this.form.patchValue({
      ...cfg,
      timeDelaySeconds: cfg.timeDelaySeconds ??
                        (cfg.showDelay != null ? cfg.showDelay / 1_000 : 8),
    });
  }
}
