import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductApiService } from '../../../../../core/services/product-api.service';
import { SaleDto } from '../../../../../core/models/product-api.model';

@Component({
  selector: 'app-sale-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './sale-detail.component.html',
  styleUrl: './sale-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleDetailComponent {
  private readonly api = inject(ProductApiService);
  private readonly route = inject(ActivatedRoute);

  readonly sale = signal<SaleDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private async load(id: string) {
    try {
      const d = await firstValueFrom(this.api.getSale(id));
      this.sale.set(d);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load sale');
    } finally {
      this.loading.set(false);
    }
  }
}
