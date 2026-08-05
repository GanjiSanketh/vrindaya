import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MarketingApiService } from './services/marketing-api.service';
import { ContentIdea } from './models/content-idea.model';

@Component({
  selector: 'app-content-planner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-planner.component.html',
  styleUrl: './content-planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPlannerComponent implements OnInit {
  readonly marketingApi = inject(MarketingApiService);

  readonly contentIdeas = signal<ContentIdea[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      const data = await firstValueFrom(this.marketingApi.getContentIdeas());
      this.contentIdeas.set(data);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load content ideas');
    } finally {
      this.loading.set(false);
    }
  }

  confidenceColor(confidence: number): string {
    if (confidence >= 80) return '#22a34a';
    if (confidence >= 60) return '#d97706';
    return '#dc2626';
  }
}