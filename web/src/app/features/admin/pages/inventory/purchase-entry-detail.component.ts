import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { PurchaseEntry } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-purchase-entry-detail',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './purchase-entry-detail.component.html',
  styleUrl:    './purchase-entry-detail.component.css',
})
export class PurchaseEntryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;

  readonly entry   = signal<PurchaseEntry | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    try {
      this.entry.set(await this.svc.getPurchaseEntry(id));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this purchase entry.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  totalQuantity(entry: PurchaseEntry): number {
    return entry.items.reduce((sum, i) => sum + i.quantity, 0);
  }
}
