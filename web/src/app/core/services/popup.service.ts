import { HttpClient }                       from '@angular/common/http';
import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { catchError, of }                  from 'rxjs';

import { PopupConfig, CampaignType } from '../models/popup.model';
import { Product }                   from '../models/product.model';
import { ProductService }            from './product.service';

const SESSION_KEY = 'vrindaya_popup_shown';
const STORAGE_KEY = 'vrindaya_popup_config';

@Injectable({ providedIn: 'root' })
export class PopupService {
  private readonly http          = inject(HttpClient);
  private readonly platformId    = inject(PLATFORM_ID);
  private readonly productService = inject(ProductService);

  readonly floatingCard = signal(false);
  readonly fullPopup    = signal(false);
  readonly visible      = this.fullPopup.asReadonly();

  get allProducts(): Product[] { return this.productService.allProducts; }

  private config:         PopupConfig | null = null;
  private product:        Product | undefined;
  private triggered       = false;
  private timer:          ReturnType<typeof setTimeout> | null = null;
  private scrollListener: (() => void) | null = null;

  loadAndSchedule(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.config) {
      this.setupTriggers();
      return;
    }

    const local = this.getLocalConfig();
    if (local) {
      this.config = local;
      this.setupTriggers();
      return;
    }

    this.http
      .get<PopupConfig>('assets/config/popup-config.json')
      .pipe(catchError(() => of(null)))
      .subscribe(cfg => {
        if (cfg) {
          this.config = cfg;
          this.setupTriggers();
        }
      });
  }

  openFullPopup(): void {
    this.floatingCard.set(false);
    this.fullPopup.set(true);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
    this.markShown();
  }

  dismissFloatingCard(): void {
    this.floatingCard.set(false);
    this.markShown();
  }

  closeFullPopup(): void {
    this.fullPopup.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
    this.markShown();
  }

  close(): void { this.closeFullPopup(); }

  deactivate(): void {
    this.clearTriggers();
    this.triggered = false;
    this.floatingCard.set(false);
    this.fullPopup.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  getConfig():  PopupConfig | null  { return this.config;  }
  getProduct(): Product | undefined { return this.product; }

  saveConfig(config: PopupConfig): void {
    this.config = config;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }

  getLocalConfig(): PopupConfig | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as PopupConfig; }
    catch { return null; }
  }

  resetToFile(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private setupTriggers(): void {
    if (!this.config?.enabled) return;
    if (this.config.showOncePerSession && sessionStorage.getItem(SESSION_KEY)) return;

    this.product = this.resolveProduct();

    const triggerType = this.config.triggerType    ?? 'SCROLL_OR_TIME';
    const scrollPct   = this.config.scrollPercentage ?? 30;
    const delaySecs   = this.config.timeDelaySeconds ??
                        (this.config.showDelay != null ? this.config.showDelay / 1000 : 8);

    if (triggerType === 'TIME_ONLY' || triggerType === 'SCROLL_OR_TIME') {
      this.timer = setTimeout(() => this.triggerCard(), delaySecs * 1_000);
    }

    if (triggerType === 'SCROLL_ONLY' || triggerType === 'SCROLL_OR_TIME') {
      const onScroll = () => {
        const scrolled = window.scrollY;
        const total    = document.documentElement.scrollHeight - window.innerHeight;
        if (total > 0 && (scrolled / total) * 100 >= scrollPct) {
          this.triggerCard();
        }
      };
      this.scrollListener = onScroll;
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  private triggerCard(): void {
    if (this.triggered) return;
    this.triggered = true;
    this.clearTriggers();
    this.floatingCard.set(true);
  }

  private clearTriggers(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
  }

  private resolveProduct(): Product | undefined {
    if (!this.config) return undefined;
    const campaign: CampaignType = this.config.campaignType ?? 'MANUAL_PRODUCT';
    switch (campaign) {
      case 'TRENDING':     return this.allProducts.find(p => p.isTrending);
      case 'NEW_ARRIVAL':  return this.allProducts.find(p => p.isNew);
      case 'BEST_SELLER':  return this.allProducts.find(p => p.isBestSeller);
      default:             return this.allProducts.find(p => p.id === this.config!.productId);
    }
  }

  private markShown(): void {
    if (isPlatformBrowser(this.platformId) && this.config?.showOncePerSession) {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }
}
