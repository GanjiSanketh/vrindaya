import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface ProviderUsage {
  name: string;
  tokensUsed: number;
  imagesGenerated: number;
  cost: number;
  percentage: number;
}

interface MonthlyUsage {
  month: string;
  tokens: number;
  images: number;
  cost: number;
}

@Component({
  selector: 'app-ai-cost-dashboard',
  standalone: true,
  imports: [],
  template: `
    <div class="acd-page">
      <div class="acd-header">
        <h1 class="acd-title">AI Cost Dashboard</h1>
        <p class="acd-desc">Mock analytics for AI usage, costs, and provider breakdown.</p>
      </div>

      <div class="acd-kpi-grid">
        <div class="acd-kpi-card">
          <div class="acd-kpi-icon"><i class="bi bi-text-paragraph"></i></div>
          <div class="acd-kpi-body">
            <span class="acd-kpi-value">{{ totalTokens() }}</span>
            <span class="acd-kpi-label">Tokens Used</span>
          </div>
        </div>
        <div class="acd-kpi-card">
          <div class="acd-kpi-icon"><i class="bi bi-image"></i></div>
          <div class="acd-kpi-body">
            <span class="acd-kpi-value">{{ totalImages() }}</span>
            <span class="acd-kpi-label">Images Generated</span>
          </div>
        </div>
        <div class="acd-kpi-card">
          <div class="acd-kpi-icon"><i class="bi bi-lightning"></i></div>
          <div class="acd-kpi-body">
            <span class="acd-kpi-value">{{ promptCount() }}</span>
            <span class="acd-kpi-label">Prompt Count</span>
          </div>
        </div>
        <div class="acd-kpi-card">
          <div class="acd-kpi-icon"><i class="bi bi-stopwatch"></i></div>
          <div class="acd-kpi-body">
            <span class="acd-kpi-value">{{ avgGenTime() }}</span>
            <span class="acd-kpi-label">Avg Generation Time</span>
          </div>
        </div>
      </div>

      <div class="acd-section">
        <h2 class="acd-section-title">Monthly Usage</h2>
        <div class="acd-table-wrap">
          <table class="acd-table">
            <thead>
              <tr>
                <th class="acd-th">Month</th>
                <th class="acd-th">Tokens</th>
                <th class="acd-th">Images</th>
                <th class="acd-th">Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              @for (row of monthlyUsage(); track row.month) {
                <tr>
                  <td class="acd-td">{{ row.month }}</td>
                  <td class="acd-td">{{ row.tokens }}</td>
                  <td class="acd-td">{{ row.images }}</td>
                  <td class="acd-td">\${{ row.cost }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="acd-section">
        <h2 class="acd-section-title">Provider Usage</h2>
        <div class="acd-provider-list">
          @for (provider of providerUsage(); track provider.name) {
            <div class="acd-provider-card">
              <div class="acd-provider-header">
                <span class="acd-provider-name">{{ provider.name }}</span>
                <span class="acd-provider-cost">\${{ provider.cost }}</span>
              </div>
              <div class="acd-provider-stats">
                <span class="acd-provider-stat">{{ provider.tokensUsed }} tokens</span>
                <span class="acd-provider-stat">{{ provider.imagesGenerated }} images</span>
              </div>
              <div class="acd-provider-bar">
                <div class="acd-provider-fill" [style.width.%]="provider.percentage"></div>
              </div>
              <span class="acd-provider-pct">{{ provider.percentage }}%</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-cost-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiCostDashboardComponent {
  totalTokens = signal('1,284,392');
  totalImages = signal('3,847');
  promptCount = signal('8,412');
  avgGenTime = signal('4.2s');

  monthlyUsage = signal<MonthlyUsage[]>([
    { month: 'Jan', tokens: 182000, images: 420, cost: 48.50 },
    { month: 'Feb', tokens: 195000, images: 380, cost: 52.10 },
    { month: 'Mar', tokens: 210000, images: 510, cost: 58.30 },
    { month: 'Apr', tokens: 178000, images: 350, cost: 45.80 },
    { month: 'May', tokens: 225000, images: 490, cost: 61.20 },
    { month: 'Jun', tokens: 294392, images: 2697, cost: 82.40 },
  ]);

  providerUsage = signal<ProviderUsage[]>([
    { name: 'OpenAI GPT-4', tokensUsed: 780000, imagesGenerated: 1200, cost: 142.50, percentage: 61 },
    { name: 'Claude 3.5', tokensUsed: 320000, imagesGenerated: 800, cost: 58.20, percentage: 25 },
    { name: 'Stable Diffusion', tokensUsed: 0, imagesGenerated: 1847, cost: 24.80, percentage: 14 },
  ]);
}