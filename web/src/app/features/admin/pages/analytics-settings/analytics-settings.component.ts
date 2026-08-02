import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { AnalyticsSettingsService } from '../../../../core/analytics/analytics-settings.service';
import { AnalyticsSettings, ANALYTICS_SETTING_FIELDS } from '../../../../core/analytics/analytics-settings.model';
import { LoggerService } from '../../../../core/services/logger.service';

/** Boolean toggle keys on the analytics settings document (excludes updatedAt / updatedBy). */
export type AnalyticsToggleKey = Exclude<keyof AnalyticsSettings, 'updatedAt' | 'updatedBy'>;

export interface AnalyticsFieldMeta {
  key: AnalyticsToggleKey;
  label: string;
  hint: string;
  icon: string;
}

/** Every switch on the page, in display order, with admin-facing copy. */
export const ANALYTICS_FIELD_META: AnalyticsFieldMeta[] = [
  {
    key: 'trackingEnabled',
    label: 'Enable Website Tracking',
    hint: 'Master switch. When off, no customer interaction is recorded anywhere on the website.',
    icon: 'bi-toggle-on',
  },
  {
    key: 'productClicks',
    label: 'Enable Product Click Tracking',
    hint: 'Tracks product card clicks, quick views, product detail views and cart/purchase actions.',
    icon: 'bi-bag',
  },
  {
    key: 'heroClicks',
    label: 'Enable Hero Banner Tracking',
    hint: 'Tracks which hero slides customers click.',
    icon: 'bi-image',
  },
  {
    key: 'categoryClicks',
    label: 'Enable Category Click Tracking',
    hint: 'Tracks category cards and filters customers click.',
    icon: 'bi-tags',
  },
  {
    key: 'searchTracking',
    label: 'Enable Search Tracking',
    hint: 'Records search queries and which results customers open.',
    icon: 'bi-search',
  },
  {
    key: 'wishlistTracking',
    label: 'Enable Wishlist Tracking',
    hint: 'Tracks when customers add or remove items from their wishlist.',
    icon: 'bi-heart',
  },
  {
    key: 'collectionClicks',
    label: 'Enable Collection Click Tracking',
    hint: 'Tracks clicks on collections such as New Arrivals, Trending and Shop.',
    icon: 'bi-collection',
  },
  {
    key: 'pageViews',
    label: 'Enable Page View Tracking',
    hint: 'Records every page the customer visits on the storefront.',
    icon: 'bi-globe',
  },
  {
    key: 'scrollTracking',
    label: 'Enable Scroll Tracking',
    hint: 'Tracks scroll depth events across the site. Off by default to keep the homepage light.',
    icon: 'bi-mouse',
  },
  {
    key: 'performanceTracking',
    label: 'Enable Performance Tracking',
    hint: 'Captures page-load timing (TTFB, DOM content loaded) on each visit. Off by default.',
    icon: 'bi-speedometer2',
  },
];

@Component({
  selector: 'app-analytics-settings',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './analytics-settings.component.html',
  styleUrl: './analytics-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsSvc = inject(AnalyticsSettingsService);
  private readonly logger = inject(LoggerService);

  readonly fields = ANALYTICS_FIELD_META;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  /** The settings currently persisted in Firestore (baseline for diffs). */
  readonly saved = signal<AnalyticsSettings | null>(null);

  /** Deep snapshot of the settings as last loaded / saved — the dirty-check baseline. */
  private readonly original = signal<AnalyticsSettings | null>(null);

  /** True whenever the form differs from {@link original} — including all-off configurations. */
  readonly unsaved = signal(false);

  readonly form = this.fb.group({
    trackingEnabled: [true],
    productClicks: [true],
    heroClicks: [true],
    categoryClicks: [true],
    searchTracking: [true],
    wishlistTracking: [true],
    collectionClicks: [true],
    pageViews: [true],
    scrollTracking: [false],
    performanceTracking: [false],
  });

  readonly lastSavedAt = computed(() => {
    const s = this.saved();
    return s?.updatedAt ? new Date(s.updatedAt).toLocaleString() : null;
  });

  readonly lastSavedBy = computed(() => this.saved()?.updatedBy ?? null);

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.saveSuccess.set(false);
      this.unsaved.set(this.isDirty());
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const settings = await this.settingsSvc.loadFresh();
      this.saved.set(settings);
      this.original.set({ ...settings });
      this.form.patchValue({
        trackingEnabled: settings.trackingEnabled,
        productClicks: settings.productClicks,
        heroClicks: settings.heroClicks,
        categoryClicks: settings.categoryClicks,
        searchTracking: settings.searchTracking,
        wishlistTracking: settings.wishlistTracking,
        collectionClicks: settings.collectionClicks,
        pageViews: settings.pageViews,
        scrollTracking: settings.scrollTracking,
        performanceTracking: settings.performanceTracking,
      });
      this.unsaved.set(this.isDirty());
    } catch {
      this.loadError.set('Failed to load analytics settings. Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    if (!this.isDirty()) return;

    const payload: Omit<AnalyticsSettings, 'updatedAt' | 'updatedBy'> = {
      trackingEnabled: this.form.get('trackingEnabled')?.value as boolean,
      productClicks: this.form.get('productClicks')?.value as boolean,
      heroClicks: this.form.get('heroClicks')?.value as boolean,
      categoryClicks: this.form.get('categoryClicks')?.value as boolean,
      searchTracking: this.form.get('searchTracking')?.value as boolean,
      wishlistTracking: this.form.get('wishlistTracking')?.value as boolean,
      collectionClicks: this.form.get('collectionClicks')?.value as boolean,
      pageViews: this.form.get('pageViews')?.value as boolean,
      scrollTracking: this.form.get('scrollTracking')?.value as boolean,
      performanceTracking: this.form.get('performanceTracking')?.value as boolean,
    };

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      const updated = await this.settingsSvc.save(payload);
      this.saved.set(updated);
      this.original.set({ ...updated });
      this.unsaved.set(false);
      this.saveSuccess.set(true);
    } catch (err) {
      this.saveError.set(this.describeSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Maps a failed save to a user-facing message: 401 is an expired session
   * (the authErrorInterceptor already signs the user out to the existing
   * login flow), 403 is a permissions problem, and anything else surfaces
   * the backend's own error message when one is present.
   */
  private describeSaveError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      this.logger.warn('[ANALYTICS-SETTINGS] Save failed — HTTP', err.status, err.message);
      if (err.status === 401) return 'Your session has expired. Please sign in again.';
      if (err.status === 403) return 'You do not have permission.';
      const backendMessage = (err.error as { message?: unknown } | null)?.message;
      if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
        return backendMessage;
      }
      return 'Save failed. Please try again.';
    }
    this.logger.warn('[ANALYTICS-SETTINGS] Save failed', err);
    return 'Save failed. Please try again.';
  }

  /** Ordered boolean-toggle snapshot used for a deterministic deep comparison. */
  private pickToggles(source: Partial<AnalyticsSettings>): Record<string, boolean> {
    const toggles: Record<string, boolean> = {};
    for (const key of ANALYTICS_SETTING_FIELDS) toggles[key] = Boolean(source[key]);
    return toggles;
  }

  /**
   * Dirty-state detection: true as soon as ANY toggle differs from the
   * original — including when every toggle is switched off.
   */
  private isDirty(): boolean {
    const baseline = this.original();
    if (!baseline) return false;
    const current = this.form.getRawValue() as Partial<AnalyticsSettings>;
    return JSON.stringify(this.pickToggles(current)) !== JSON.stringify(this.pickToggles(baseline));
  }
}
