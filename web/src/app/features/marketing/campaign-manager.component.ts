import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface Campaign {
  id: string;
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Paused' | 'Completed';
  targetAudience: string;
  platforms: string[];
  productsIncluded: string[];
  postsPlanned: number;
  postsPublished: number;
}

@Component({
  selector: 'app-campaign-manager',
  standalone: true,
  imports: [],
  template: `
    <div class="cm-page">
      <div class="cm-header">
        <h1 class="cm-title">Campaign Manager</h1>
        <p class="cm-desc">Create and manage your marketing campaigns.</p>
      </div>

      <div class="cm-actions">
        <button class="cm-btn cm-btn-primary" (click)="onCreate()">
          <i class="bi bi-plus-lg"></i>
          New Campaign
        </button>
      </div>

      <div class="cm-grid">
        @for (campaign of campaigns(); track campaign.id) {
          <div class="cm-card">
            <div class="cm-card-header">
              <h3 class="cm-card-title">{{ campaign.name }}</h3>
              <span class="cm-status" [class.cm-status-active]="campaign.status === 'Active'" [class.cm-status-paused]="campaign.status === 'Paused'" [class.cm-status-completed]="campaign.status === 'Completed'">{{ campaign.status }}</span>
            </div>

            <div class="cm-card-body">
              <div class="cm-row">
                <span class="cm-label">Objective</span>
                <span class="cm-value">{{ campaign.objective }}</span>
              </div>
              <div class="cm-row">
                <span class="cm-label">Period</span>
                <span class="cm-value">{{ campaign.startDate }} — {{ campaign.endDate }}</span>
              </div>
              <div class="cm-row">
                <span class="cm-label">Target Audience</span>
                <span class="cm-value">{{ campaign.targetAudience }}</span>
              </div>
              <div class="cm-row">
                <span class="cm-label">Platforms</span>
                <span class="cm-value">{{ campaign.platforms.join(', ') }}</span>
              </div>
              <div class="cm-row">
                <span class="cm-label">Products</span>
                <span class="cm-value">{{ campaign.productsIncluded.join(', ') }}</span>
              </div>
              <div class="cm-row">
                <span class="cm-label">Posts</span>
                <span class="cm-value">{{ campaign.postsPublished }} / {{ campaign.postsPlanned }} published</span>
              </div>
            </div>

            <div class="cm-card-actions">
              <button class="cm-action-btn" (click)="onEdit(campaign)">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="cm-action-btn" (click)="onToggleStatus(campaign)">
                <i class="bi bi-pause-fill"></i>
                {{ campaign.status === 'Active' ? 'Pause' : 'Resume' }}
              </button>
              <button class="cm-action-btn cm-action-delete" (click)="onDelete(campaign)">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './campaign-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignManagerComponent {
  campaigns = signal<Campaign[]>([
    {
      id: '1',
      name: 'Summer Sale 2026',
      objective: 'Sales Conversion',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      status: 'Active',
      targetAudience: 'Women 25-40',
      platforms: ['Instagram', 'Facebook'],
      productsIncluded: ['Silk Kurta Set', 'Embroidered Lehenga'],
      postsPlanned: 12,
      postsPublished: 5,
    },
    {
      id: '2',
      name: 'Wedding Collection Launch',
      objective: 'Brand Awareness',
      startDate: '2026-07-15',
      endDate: '2026-09-15',
      status: 'Active',
      targetAudience: 'Brides and wedding guests',
      platforms: ['Instagram', 'Pinterest'],
      productsIncluded: ['Designer Saree', 'Wedding Lehenga'],
      postsPlanned: 20,
      postsPublished: 8,
    },
    {
      id: '3',
      name: 'Festival Special',
      objective: 'Engagement',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      status: 'Paused',
      targetAudience: 'Festival shoppers',
      platforms: ['Instagram'],
      productsIncluded: ['Festive Kurti', 'Traditional Jewellery'],
      postsPlanned: 8,
      postsPublished: 3,
    },
  ]);

  onCreate(): void {}

  onEdit(_campaign: Campaign): void {}

  onToggleStatus(campaign: Campaign): void {
    if (campaign.status === 'Active') {
      campaign.status = 'Paused';
    } else if (campaign.status === 'Paused') {
      campaign.status = 'Active';
    }
  }

  onDelete(_campaign: Campaign): void {}
}