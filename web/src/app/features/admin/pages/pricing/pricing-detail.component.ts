import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PricingService } from '../../services/pricing.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricingRow, PricingRecommendationResponse } from '../../models/pricing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-pricing-detail',
  standalone:  true,
  imports:     [RouterLink, EmptyStateComponent],
  templateUrl: './pricing-detail.component.html',
  styleUrl:    './pricing-detail.component.css',
})
export class PricingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(PricingService);
  private readonly toast = inject(ToastService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory/pricing`;
  private pricingId = '';

  readonly row     = signal<PricingRow | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly recs    = signal<PricingRecommendationResponse | null>(null);
  readonly recsLoading = signal(false);
  readonly recsError   = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.pricingId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    this.error.set(null);
    try {
      const row = await this.svc.getOne(this.pricingId);
      this.row.set(row);
      void this.loadRecommendations();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load pricing record.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadRecommendations(): Promise<void> {
    this.recsLoading.set(true);
    this.recsError.set(null);
    try {
      this.recs.set(await this.svc.getRecommendations(this.pricingId));
    } catch (err) {
      this.recsError.set(err instanceof Error ? err.message : 'Could not load recommendations.');
    } finally {
      this.recsLoading.set(false);
    }
  }

  print(): void {
    window.print();
  }

  copyId(): void {
    void navigator.clipboard.writeText(this.pricingId).then(
      () => this.toast.success('ID copied to clipboard.'),
      () => this.toast.error('Failed to copy ID.'),
    );
  }

  formatCurrency(value: number): string {
    return `\u20B9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
