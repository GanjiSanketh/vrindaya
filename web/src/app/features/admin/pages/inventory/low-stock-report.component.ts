import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { InventoryVariant } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-low-stock-report',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './low-stock-report.component.html',
  styleUrl:    './low-stock-report.component.css',
})
export class LowStockReportComponent {
  private readonly svc = inject(InventoryService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;

  readonly variants = signal<InventoryVariant[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const items = await this.svc.getLowStockVariants();
      // Critical first, then Low.
      this.variants.set([...items].sort((a, b) => (a.status === 'Critical' ? -1 : 1) - (b.status === 'Critical' ? -1 : 1)));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the low stock report.');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}
