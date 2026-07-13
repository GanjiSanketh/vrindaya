import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { CampaignService } from '../../../marketing/services/campaign.service';
import { CAMPAIGN_MEDIA_TYPE_ICONS, CAMPAIGN_MEDIA_TYPES, CampaignMediaType } from '../../../marketing/models/campaign.model';

@Component({
  selector:   'app-admin-analytics',
  standalone: true,
  template: `
    <div class="an-page">
      <div class="an-header">
        <h1 class="an-title">Analytics</h1>
        <p class="an-sub">Site analytics and performance insights.</p>
      </div>

      <div class="an-card an-card--breakdown">
        <h2 class="an-breakdown-title">Campaigns by Media Type</h2>
        @if (campaignSvc.loading()) {
          <p class="an-breakdown-state">Loading campaigns...</p>
        } @else if (campaignSvc.campaigns().length === 0) {
          <p class="an-breakdown-state">No campaigns yet.</p>
        } @else {
          <div class="an-breakdown-grid">
            @for (t of mediaTypes; track t) {
              <div class="an-breakdown-item">
                <div class="an-breakdown-icon"><i class="bi {{ mediaTypeIcon(t) }}"></i></div>
                <span class="an-breakdown-value">{{ mediaTypeBreakdown()[t] }}</span>
                <span class="an-breakdown-label">{{ t }}</span>
              </div>
            }
          </div>
        }
      </div>

      <div class="an-card">
        <div class="an-icon"><i class="bi bi-graph-up-arrow"></i></div>
        <h2 class="an-card-title">Analytics Dashboard</h2>
        <p class="an-card-body">
          Connect Google Analytics or your preferred analytics provider to view
          traffic, conversion, and product performance data here.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .an-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .an-title { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.25rem; }
    .an-sub { color: #6b7280; font-size: 0.875rem; margin: 0; }
    .an-card {
      background: #fff; border-radius: 12px; padding: 3rem 2rem;
      text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .an-card--breakdown { padding: 1.5rem; text-align: left; }
    .an-breakdown-title {
      font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 700;
      color: #0c4a58; margin: 0 0 1rem;
    }
    .an-breakdown-state { color: #6b7280; font-size: 0.85rem; margin: 0; }
    .an-breakdown-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.85rem;
    }
    .an-breakdown-item {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      background: #f8fafb; border-radius: 10px; padding: 1rem 0.5rem;
    }
    .an-breakdown-icon { font-size: 1.15rem; color: #0f6f84; }
    .an-breakdown-value { font-size: 1.3rem; font-weight: 700; color: #1a1a2e; }
    .an-breakdown-label { font-size: 0.68rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .an-icon { font-size: 3rem; color: #0c4a58; opacity: 0.25; margin-bottom: 1rem; }
    .an-card-title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.5rem; }
    .an-card-body  { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin: 0; max-width: 420px; margin-inline: auto; }
    @media (max-width: 768px) { .an-breakdown-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 480px) { .an-breakdown-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class AdminAnalyticsComponent implements OnInit, OnDestroy {
  readonly campaignSvc = inject(CampaignService);

  readonly mediaTypes = CAMPAIGN_MEDIA_TYPES;

  readonly mediaTypeBreakdown = computed<Record<CampaignMediaType, number>>(() => {
    const counts: Record<CampaignMediaType, number> = { Text: 0, Image: 0, Video: 0, PDF: 0, Mixed: 0 };
    for (const c of this.campaignSvc.campaigns()) {
      counts[c.mediaType] = (counts[c.mediaType] ?? 0) + 1;
    }
    return counts;
  });

  ngOnInit(): void {
    this.campaignSvc.getCampaigns();
  }

  ngOnDestroy(): void {
    this.campaignSvc.stopListening();
  }

  mediaTypeIcon(mediaType: CampaignMediaType): string {
    return CAMPAIGN_MEDIA_TYPE_ICONS[mediaType] ?? CAMPAIGN_MEDIA_TYPE_ICONS['Text'];
  }
}
