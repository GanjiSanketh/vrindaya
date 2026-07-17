import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductListingService } from '../../services/product-listing.service';
import { MarketplaceDashboard } from '../../models/product-listing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

@Component({
  selector:    'app-marketplace-dashboard',
  standalone:  true,
  imports:     [RouterLink, ChartComponent],
  templateUrl: './marketplace-dashboard.component.html',
  styleUrl:    './marketplace-dashboard.component.css',
})
export class MarketplaceDashboardComponent {
  private readonly svc = inject(ProductListingService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/marketplace`;

  readonly data    = signal<MarketplaceDashboard | null>(null);
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
      this.error.set(err instanceof Error ? err.message : 'Could not load the marketplace dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  namedLabels(items: { name: string }[]): string[] {
    return items.map(i => i.name);
  }

  namedValues(items: { value: number }[]): number[] {
    return items.map(i => i.value);
  }
}
