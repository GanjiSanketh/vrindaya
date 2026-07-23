import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductApiService, PricingDashboardResponse } from '../../../../core/services/product-api.service';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

@Component({
  selector: 'app-pricing-dashboard',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './pricing-dashboard.component.html',
  styleUrl: './pricing-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingDashboardComponent {
  private readonly api = inject(ProductApiService);

  readonly data = signal<PricingDashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getPricingDashboard());
      this.data.set(d);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load pricing data.');
    } finally {
      this.loading.set(false);
    }
  }

  get topLabels(): string[] {
    return this.data()?.topProfitable?.map(p => p.productName) ?? [];
  }
  get topProfits(): number[] {
    return this.data()?.topProfitable?.map(p => p.profit) ?? [];
  }
  get leastLabels(): string[] {
    return this.data()?.leastProfitable?.map(p => p.productName) ?? [];
  }
  get leastProfits(): number[] {
    return this.data()?.leastProfitable?.map(p => p.profit) ?? [];
  }
  get lossLabels(): string[] {
    return this.data()?.sellingAtLoss?.map(p => p.productName) ?? [];
  }
  get lossValues(): number[] {
    return this.data()?.sellingAtLoss?.map(p => p.profit) ?? [];
  }
}
