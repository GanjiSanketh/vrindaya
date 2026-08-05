import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MarketingApiService } from './services/marketing-api.service';
import { TrendData } from './models/trend-data.model';

@Component({
  selector: 'app-trend-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trend-analysis.component.html',
  styleUrl: './trend-analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendAnalysisComponent implements OnInit {
  readonly marketingApi = inject(MarketingApiService);

  readonly trends = signal<TrendData[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      const data = await firstValueFrom(this.marketingApi.getTrendAnalysis());
      this.trends.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load trend data');
    } finally {
      this.loading.set(false);
    }
  }
}