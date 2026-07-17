import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { RevenueService } from '../../services/revenue.service';
import { CreateRevenueRequest, REVENUE_SOURCES, REVENUE_STATUSES } from '../../models/revenue.model';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector:    'app-revenue-form',
  standalone:  true,
  imports:     [FormsModule, RouterLink],
  templateUrl: './revenue-form.component.html',
  styleUrl:    './revenue-form.component.css',
})
export class RevenueFormComponent {
  private readonly svc = inject(RevenueService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly sources = REVENUE_SOURCES;
  readonly statuses = REVENUE_STATUSES;
  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly revenueId = signal<string | null>(null);

  readonly model: CreateRevenueRequest = {
    source: '',
    amount: 0,
    reference: '',
    settlementDate: toDateInputValue(new Date()),
    expectedSettlement: 0,
    actualSettlement: undefined,
    status: 'Pending',
    productId: '',
    productName: '',
    notes: '',
  };

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.revenueId.set(id);
      void this.loadRevenue(id);
    }
  }

  private async loadRevenue(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const revenue = await this.svc.getOne(id);
      this.model.source = revenue.source;
      this.model.amount = revenue.amount;
      this.model.reference = revenue.reference ?? '';
      this.model.settlementDate = new Date(revenue.settlementDate).toISOString().slice(0, 10);
      this.model.expectedSettlement = revenue.expectedSettlement;
      this.model.actualSettlement = revenue.actualSettlement ?? undefined;
      this.model.status = revenue.status;
      this.model.productId = revenue.productId ?? '';
      this.model.productName = revenue.productName ?? '';
      this.model.notes = revenue.notes ?? '';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load revenue.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (!this.model.source || this.model.amount <= 0) {
      this.error.set('Source and Amount are required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const payload: CreateRevenueRequest = {
        ...this.model,
        settlementDate: new Date(this.model.settlementDate + 'T00:00:00Z').toISOString(),
      };
      if (this.isEdit() && this.revenueId()) {
        await this.svc.update(this.revenueId()!, payload);
      } else {
        await this.svc.create(payload);
      }
      await this.router.navigate(['/admin/revenues']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not save revenue.');
    } finally {
      this.saving.set(false);
    }
  }
}
