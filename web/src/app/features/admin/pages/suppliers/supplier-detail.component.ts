import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { Supplier, SupplierStats } from '../../models/supplier.model';
import { PurchaseEntry } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-supplier-detail',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './supplier-detail.component.html',
  styleUrl:    './supplier-detail.component.css',
})
export class SupplierDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(SupplierService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/suppliers`;
  private supplierId = '';

  readonly supplier = signal<Supplier | null>(null);
  readonly stats    = signal<SupplierStats | null>(null);
  readonly history  = signal<PurchaseEntry[]>([]);

  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly busy    = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly hasNext     = signal(false);
  readonly hasPrevious = signal(false);
  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private cursorHistory: (string | null)[] = [];

  async ngOnInit(): Promise<void> {
    this.supplierId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    this.error.set(null);
    try {
      const [supplier, stats] = await Promise.all([
        this.svc.getOne(this.supplierId),
        this.svc.getStats(this.supplierId),
      ]);
      this.supplier.set(supplier);
      this.stats.set(stats);
      await this.loadHistory();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this supplier.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    const page = await this.svc.getPurchaseHistory(this.supplierId, this.currentCursor);
    this.history.set(page.items);
    this.nextCursor = page.nextCursor;
    this.hasNext.set(!!page.nextCursor);
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext()) return;
    this.cursorHistory.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.loadHistory();
  }

  async previousPage(): Promise<void> {
    if (this.cursorHistory.length === 0) return;
    this.currentCursor = this.cursorHistory.pop() ?? null;
    this.hasPrevious.set(this.cursorHistory.length > 0);
    await this.loadHistory();
  }

  async toggleActive(): Promise<void> {
    const current = this.supplier();
    if (!current) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = current.isActive ? await this.svc.deactivate(current.id) : await this.svc.activate(current.id);
      this.supplier.set(updated);
    } catch (err) {
      this.actionError.set(err instanceof Error ? err.message : 'Failed to update supplier status.');
    } finally {
      this.busy.set(false);
    }
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  totalQuantity(entry: PurchaseEntry): number {
    return entry.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  cityStateLine(s: Supplier): string {
    const parts = [s.city, s.state, s.pincode].filter((v): v is string => !!v);
    return parts.length > 0 ? parts.join(', ') : '—';
  }
}
