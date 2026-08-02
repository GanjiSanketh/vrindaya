import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AnalyticsSettingsService } from '../../../../core/analytics/analytics-settings.service';
import { AnalyticsSettings } from '../../../../core/analytics/analytics-settings.model';
import { AdminAuthService } from '../../services/admin-auth.service';

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
  private readonly auth = inject(AdminAuthService);

  readonly fields = ANALYTICS_FIELD_META;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal<string | null>(null);

  /** The settings currently persisted in Firestore (baseline for diffs). */
  readonly saved = signal<AnalyticsSettings | null>(null);

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

  /** True whenever any toggle differs from the persisted settings. */
  readonly unsaved = computed(() => {
    const saved = this.saved();
    if (!saved) return false;
    return ANALYTICS_FIELD_META.some(f => this.form.get(f.key)?.value !== saved[f.key]);
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saveSuccess.set(false));
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
    } catch {
      this.loadError.set('Failed to load analytics settings. Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.saving()) return;

    const patch: Partial<AnalyticsSettings> = {};
    let modified = false;
    for (const field of ANALYTICS_FIELD_META) {
      const next = this.form.get(field.key)?.value as boolean;
      if (next !== this.saved()?.[field.key]) {
        patch[field.key] = next;
        modified = true;
      }
    }
    if (!modified) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      const adminEmail = this.auth.currentUser()?.email ?? '';
      const updated = await this.settingsSvc.save(patch, adminEmail);
      this.saved.set(updated);
      this.saveSuccess.set(true);
    } catch {
      this.saveError.set('Could not save. You need Admin access — please sign in again and retry.');
    } finally {
      this.saving.set(false);
    }
  }
}
