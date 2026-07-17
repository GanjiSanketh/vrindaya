import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { PurchaseEntry } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-purchase-entry-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './purchase-entry-list.component.html',
  styleUrl:    './purchase-entry-list.component.css',
})
export class PurchaseEntryListComponent {
  private readonly svc = inject(InventoryService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;

  readonly entries = signal<PurchaseEntry[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.svc.getPurchaseEntries(this.currentCursor);
      this.entries.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load purchase entries.');
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext()) return;
    this.history.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.history.length === 0) return;
    this.currentCursor = this.history.pop() ?? null;
    this.hasPrevious.set(this.history.length > 0);
    await this.load();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  totalQuantity(entry: PurchaseEntry): number {
    return entry.items.reduce((sum, i) => sum + i.quantity, 0);
  }
}
