import { HttpClient }        from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }  from '@angular/common';
import { BehaviorSubject }    from 'rxjs';
import { catchError, of }     from 'rxjs';

import { PopupConfig }  from '../models/popup.model';
import { Product }      from '../models/product.model';
import productsData     from '../data/products.json';

const SESSION_KEY = 'vrindaya_popup_shown';
const STORAGE_KEY = 'vrindaya_popup_config';

@Injectable({ providedIn: 'root' })
export class PopupService {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  /* Emits true when the popup should be visible */
  private readonly _visible = new BehaviorSubject<boolean>(false);
  readonly visible$ = this._visible.asObservable();

  private config: PopupConfig | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /* All products for the admin dropdown */
  readonly allProducts = productsData as Product[];

  /* ── Public API ────────────────────────────────── */

  /** Call once from the root component after first render. */
  loadAndSchedule(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // localStorage override wins (set by admin panel)
    const local = this.getLocalConfig();
    if (local) {
      this.config = local;
      this.schedule();
      return;
    }

    // Fall back to the static JSON asset
    this.http
      .get<PopupConfig>('assets/config/popup-config.json')
      .pipe(catchError(() => of(null)))
      .subscribe(cfg => {
        if (cfg) {
          this.config = cfg;
          this.schedule();
        }
      });
  }

  close(): void {
    this._visible.next(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
      sessionStorage.setItem(SESSION_KEY, '1');
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getConfig(): PopupConfig | null { return this.config; }

  getProduct(): Product | undefined {
    return this.allProducts.find(p => p.id === this.config?.productId);
  }

  /** Persist config override in localStorage (admin panel). */
  saveConfig(config: PopupConfig): void {
    this.config = config;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }

  /** Read the admin-saved override, if any. */
  getLocalConfig(): PopupConfig | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as PopupConfig; }
    catch { return null; }
  }

  /** Remove localStorage override so the JSON asset takes effect again. */
  resetToFile(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /* ── Private ───────────────────────────────────── */

  private schedule(): void {
    if (!this.config?.enabled) return;
    if (this.config.showOncePerSession &&
        sessionStorage.getItem(SESSION_KEY)) return;

    this.timer = setTimeout(() => {
      this._visible.next(true);
      document.body.style.overflow = 'hidden';
    }, this.config.showDelay);
  }
}
