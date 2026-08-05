import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface AnalyticsCard {
  title: string;
  value: number;
  change: number;
  changeLabel: string;
  icon: string;
  color: string;
}

interface CampaignPerf {
  name: string;
  impressions: number;
  engagement: number;
  conversions: number;
  color: string;
}

interface TrendingCategory {
  name: string;
  count: number;
  growth: number;
  color: string;
}

interface Product {
  name: string;
  imageUrl: string;
  generatedCount: number;
}

interface Prompt {
  text: string;
  type: string;
  date: string;
}

interface LatestContent {
  type: string;
  title: string;
  thumbnailUrl: string;
  date: string;
  status: 'Published' | 'Draft';
}

@Component({
  selector: 'app-marketing-dashboard-premium',
  standalone: true,
  imports: [],
  template: `
    <div class="mp-page">
      <div class="mp-header">
        <h1 class="mp-title">Marketing Dashboard</h1>
        <p class="mp-desc">Overview of your AI-powered marketing performance.</p>
      </div>

      <div class="mp-row">
        @for (card of analyticsCards(); track card.title) {
          <div class="mp-card">
            <div class="mp-card-header">
              <span class="mp-card-title">{{ card.title }}</span>
              <span class="mp-card-icon" [style.background]="card.color + '1a'">
                <i class="bi {{ card.icon }}" [style.color]="card.color"></i>
              </span>
            </div>
            <div class="mp-card-value">{{ card.value }}</div>
            <div class="mp-card-change" [class.mp-positive]="card.change >= 0" [class.mp-negative]="card.change < 0">
              <i class="bi {{ card.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down' }}"></i>
              {{ card.change >= 0 ? '+' : '' }}{{ card.change }}%
              <span class="mp-change-label">{{ card.changeLabel }}</span>
            </div>
          </div>
        }
      </div>

      <div class="mp-row mp-row-2">
        <div class="mp-card mp-card-wide">
          <div class="mp-card-header">
            <span class="mp-card-title">Campaign Performance</span>
          </div>
          <div class="mp-chart">
            @for (campaign of campaignPerformance(); track campaign.name) {
              <div class="mp-chart-row">
                <span class="mp-chart-label">{{ campaign.name }}</span>
                <div class="mp-chart-bar-track">
                  <div class="mp-chart-bar" [style.width.%]="campaign.impressions / maxImpressions() * 100" [style.background]="campaign.color"></div>
                </div>
                <span class="mp-chart-value">{{ campaign.impressions.toLocaleString() }}</span>
              </div>
            }
          </div>
          <div class="mp-chart-legend">
            <span class="mp-legend-item"><span class="mp-legend-dot" style="background:#0c4a58"></span> Impressions</span>
            <span class="mp-legend-item"><span class="mp-legend-dot" style="background:#22a34a"></span> Engagement</span>
            <span class="mp-legend-item"><span class="mp-legend-dot" style="background:#c9a54c"></span> Conversions</span>
          </div>
        </div>

        <div class="mp-card">
          <div class="mp-card-header">
            <span class="mp-card-title">Trending Categories</span>
          </div>
          <div class="mp-trending">
            @for (cat of trendingCategories(); track cat.name) {
              <div class="mp-trending-item">
                <div class="mp-trending-bar" [style.width.%]="cat.count / maxCategoryCount() * 100" [style.background]="cat.color"></div>
                <span class="mp-trending-name">{{ cat.name }}</span>
                <span class="mp-trending-count">{{ cat.count }}</span>
                <span class="mp-trending-growth" [class.mp-positive]="cat.growth >= 0" [class.mp-negative]="cat.growth < 0">
                  {{ cat.growth >= 0 ? '+' : '' }}{{ cat.growth }}%
                </span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="mp-row mp-row-2">
        <div class="mp-card">
          <div class="mp-card-header">
            <span class="mp-card-title">Most Used Products</span>
          </div>
          <div class="mp-product-list">
            @for (product of mostUsedProducts(); track product.name) {
              <div class="mp-product-item">
                <div class="mp-product-thumb">
                  <i class="bi bi-image"></i>
                </div>
                <div class="mp-product-info">
                  <span class="mp-product-name">{{ product.name }}</span>
                  <span class="mp-product-count">{{ product.generatedCount }} generated</span>
                </div>
                <div class="mp-product-bar-track">
                  <div class="mp-product-bar" [style.width.%]="product.generatedCount / maxProductCount() * 100"></div>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="mp-card">
          <div class="mp-card-header">
            <span class="mp-card-title">Most Generated Prompts</span>
          </div>
          <div class="mp-prompt-list">
            @for (prompt of mostGeneratedPrompts(); track prompt.text) {
              <div class="mp-prompt-item">
                <span class="mp-prompt-text">"{{ prompt.text }}"</span>
                <div class="mp-prompt-meta">
                  <span class="mp-prompt-type">{{ prompt.type }}</span>
                  <span class="mp-prompt-date">{{ prompt.date }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="mp-card">
        <div class="mp-card-header">
          <span class="mp-card-title">Latest AI Content</span>
        </div>
        <div class="mp-latest-grid">
          @for (item of latestContent(); track item.title) {
            <div class="mp-latest-card">
              <div class="mp-latest-thumb">
                <i class="bi bi-{{ item.type === 'Reel' ? 'camera-video' : 'image' }}"></i>
              </div>
              <div class="mp-latest-info">
                <span class="mp-latest-title">{{ item.title }}</span>
                <span class="mp-latest-date">{{ item.date }}</span>
              </div>
              <span class="mp-latest-status" [class.mp-status-published]="item.status === 'Published'" [class.mp-status-draft]="item.status === 'Draft'">
                {{ item.status }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './marketing-dashboard-premium.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingDashboardPremiumComponent {
  analyticsCards = signal<AnalyticsCard[]>([
    { title: 'Generated This Month', value: 247, change: 12, changeLabel: 'vs last month', icon: 'bi-lightning', color: '#0c4a58' },
    { title: 'Posts Published', value: 89, change: 8, changeLabel: 'vs last month', icon: 'bi-postcard', color: '#22a34a' },
    { title: 'Reels Published', value: 34, change: 15, changeLabel: 'vs last month', icon: 'bi-camera-video', color: '#c9a54c' },
    { title: 'Drafts', value: 12, change: -3, changeLabel: 'vs last month', icon: 'bi-file-earmark', color: '#6b7280' },
    { title: 'Scheduled', value: 56, change: 22, changeLabel: 'vs last month', icon: 'bi-calendar3', color: '#0f6f84' },
  ]);

  campaignPerformance = signal<CampaignPerf[]>([
    { name: 'Summer Sale 2026', impressions: 45000, engagement: 3200, conversions: 890, color: '#0c4a58' },
    { name: 'Wedding Collection', impressions: 32000, engagement: 2800, conversions: 650, color: '#c9a54c' },
    { name: 'Festival Special', impressions: 28000, engagement: 2100, conversions: 520, color: '#22a34a' },
    { name: 'New Arrival', impressions: 19000, engagement: 1500, conversions: 380, color: '#0f6f84' },
    { name: 'Daily Wear', impressions: 15000, engagement: 1100, conversions: 290, color: '#d97706' },
  ]);

  maxImpressions = signal(45000);

  trendingCategories = signal<TrendingCategory[]>([
    { name: 'Festive Wear', count: 42, growth: 18, color: '#22a34a' },
    { name: 'Office Wear', count: 35, growth: 12, color: '#0c4a58' },
    { name: 'Wedding Wear', count: 28, growth: 8, color: '#c9a54c' },
    { name: 'Casual', count: 24, growth: -5, color: '#6b7280' },
    { name: 'Luxury', count: 18, growth: 22, color: '#0f6f84' },
  ]);

  maxCategoryCount = signal(42);

  mostUsedProducts = signal<Product[]>([
    { name: 'Silk Kurta Set', imageUrl: '', generatedCount: 34 },
    { name: 'Embroidered Lehenga', imageUrl: '', generatedCount: 28 },
    { name: 'Cotton Tunic', imageUrl: '', generatedCount: 22 },
    { name: 'Designer Saree', imageUrl: '', generatedCount: 19 },
    { name: 'Anarkali Suit', imageUrl: '', generatedCount: 15 },
  ]);

  maxProductCount = signal(34);

  mostGeneratedPrompts = signal<Prompt[]>([
    { text: 'Elegant woman in silk kurta', type: 'Post', date: '2026-08-01' },
    { text: 'Festive celebration with family', type: 'Reel', date: '2026-07-28' },
    { text: 'Office wear professional look', type: 'Post', date: '2026-07-25' },
    { text: 'Wedding ceremony backdrop', type: 'Reel', date: '2026-07-22' },
    { text: 'Casual summer collection', type: 'Post', date: '2026-07-20' },
  ]);

  latestContent = signal<LatestContent[]>([
    { type: 'Post', title: 'Summer Sale Post', thumbnailUrl: '', date: '2026-08-02', status: 'Published' },
    { type: 'Reel', title: 'Wedding Reel', thumbnailUrl: '', date: '2026-08-01', status: 'Published' },
    { type: 'Post', title: 'Festival Special', thumbnailUrl: '', date: '2026-07-30', status: 'Draft' },
    { type: 'Reel', title: 'Luxury Collection', thumbnailUrl: '', date: '2026-07-29', status: 'Published' },
    { type: 'Post', title: 'Office Wear Draft', thumbnailUrl: '', date: '2026-07-28', status: 'Draft' },
  ]);
}