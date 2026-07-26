import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductApiService } from '../../../../../core/services/product-api.service';
import { SaleDto } from '../../../../../core/models/product-api.model';

@Component({
  selector: 'app-sale-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './sale-list.component.html',
  styleUrl: './sale-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleListComponent {
  private readonly api = inject(ProductApiService);

  readonly sales = signal<SaleDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getSales());
      this.sales.set(d);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load sales');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteSale(id: string) {
    if (!confirm('Delete this sale record?')) return;
    try {
      await firstValueFrom(this.api.deleteSale(id));
      this.sales.update(list => list.filter(s => s.id !== id));
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to delete sale');
    }
  }

  channelBadge(channel: string): string {
    const map: Record<string, string> = { Offline: 'badge-offline', Flipkart: 'badge-flipkart', Website: 'badge-website', Instagram: 'badge-instagram', WhatsApp: 'badge-whatsapp' };
    return map[channel] || 'badge-default';
  }
}
