import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricingService } from '../../services/pricing.service';
import { PricingDashboardResponse } from '../../models/pricing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-pricing-dashboard',
  standalone:  true,
  imports:     [RouterLink, ChartComponent, EmptyStateComponent],
  templateUrl: './pricing-dashboard.component.html',
  styleUrl:    './pricing-dashboard.component.css',
})
export class PricingDashboardComponent {
  private readonly svc = inject(PricingService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory/pricing`;

  readonly data    = signal<PricingDashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.svc.getDashboard());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load pricing dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(v: number): string {
    return `\u20B9${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  formatCurrency1(v: number): string {
    return `\u20B9${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPct(v: number): string {
    return `${v.toFixed(1)}%`;
  }

  bucketLabels(buckets: { label: string }[]): string[] {
    return buckets.map(b => b.label);
  }

  bucketValues(buckets: { count: number }[]): number[] {
    return buckets.map(b => b.count);
  }

  mkLabels(items: { marketplace: string }[]): string[] {
    return items.map(i => i.marketplace);
  }

  mkCounts(items: { count: number }[]): number[] {
    return items.map(i => i.count);
  }

  mkAvgMargins(items: { averageMargin: number }[]): number[] {
    return items.map(i => i.averageMargin);
  }

  top20Labels(items: { marketplace: string; color: string; size: string; sku: string }[]): string[] {
    return items.map(i => `${i.marketplace} \u2014 ${i.color} / ${i.size} (${i.sku})`);
  }

  top20Values(items: { actualProfit: number }[]): number[] {
    return items.map(i => i.actualProfit);
  }
}
