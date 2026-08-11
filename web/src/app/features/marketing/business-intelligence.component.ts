import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../shared/services/toast.service';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { INSIGHT_CATEGORIES } from './models/business-intelligence.model';

@Component({
  selector: 'app-business-intelligence',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bi-page">
      <div class="bi-header">
        <div>
          <h1 class="bi-title"><i class="bi bi-bar-chart"></i> Business Intelligence</h1>
          <p class="bi-desc">AI-powered insights answering your critical business questions. Mock analytics with actionable recommendations.</p>
        </div>
        <div class="bi-actions">
          <button class="btn btn-outline-secondary bi-btn" (click)="refresh()">
            <i class="bi bi-arrow-clockwise"></i> Refresh Data
          </button>
        </div>
      </div>

      <!-- KPI Bar -->
      <div class="bi-kpi-bar">
        @for (kpi of kpis(); track kpi.id) {
          <div class="bi-kpi" [class]="kpi.status">
            <div class="bi-kpi-icon">
              <i class="bi {{ kpiIcon(kpi.id) }}"></i>
            </div>
            <div class="bi-kpi-content">
              <span class="bi-kpi-label">{{ kpi.label }}</span>
              <div class="bi-kpi-value-row">
                <strong class="bi-kpi-value">{{ kpi.value }}</strong>
                <span class="bi-kpi-change" [class.up]="kpi.trend === 'up'" [class.down]="kpi.trend === 'down'">
                  <i class="bi {{ kpi.trend === 'up' ? 'bi-arrow-up' : kpi.trend === 'down' ? 'bi-arrow-down' : 'bi-dash' }}"></i>
                  {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change.toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="bi-charts-row">
        <div class="bi-chart-card">
          <div class="bi-chart-header">
            <h3 class="bi-chart-title">Weekly Revenue Trend</h3>
          </div>
          <div class="bi-chart" #revenueChart></div>
        </div>
        <div class="bi-chart-card">
          <div class="bi-chart-header">
            <h3 class="bi-chart-title">Revenue by Channel</h3>
          </div>
          <div class="bi-chart" #channelChart></div>
        </div>
      </div>

      <!-- Insights Grid -->
      <div class="bi-section">
        <div class="bi-section-header">
          <h2 class="bi-section-title"><i class="bi bi-lightbulb"></i> Key Insights</h2>
          <div class="bi-severity-tabs">
            @for (sev of severities; track sev) {
              <button class="bi-tab" [class.active]="activeSeverity() === sev" (click)="activeSeverity.set(sev)">
                {{ sev | titlecase }} <span class="bi-tab-count">{{ insightCount(sev) }}</span>
              </button>
            }
          </div>
        </div>

        <div class="bi-insights-grid">
          @for (insight of filteredInsights(); track insight.id) {
            <div class="bi-insight-card" [class]="insight.severity">
              <div class="bi-insight-header">
                <div class="bi-insight-category" [style.background]="categoryColor(insight.category)">
                  <i class="bi {{ categoryIcon(insight.category) }}"></i>
                </div>
                <div class="bi-insight-badges">
                  <span class="bi-severity-badge" [class]="insight.severity">{{ insight.severity }}</span>
                  <span class="bi-confidence">{{ insight.confidence }}% confidence</span>
                </div>
              </div>

              <div class="bi-insight-question">{{ insight.question }}</div>
              <div class="bi-insight-answer">{{ insight.answer }}</div>

              <div class="bi-insight-data">
                @for (dp of insight.dataPoints; track dp.label) {
                  <div class="bi-data-point">
                    <span class="bi-data-label">{{ dp.label }}</span>
                    <div class="bi-data-value-row">
                      <strong class="bi-data-value">{{ dp.value }}</strong>
                      @if (dp.trend) {
                        <i class="bi {{ trendIcon(dp.trend) }}" [class]="'bi-trend-' + dp.trend"></i>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="bi-insight-actions">
                <button class="btn btn-sm bi-btn-expand" (click)="toggleInsight(insight.id)">
                  <i class="bi {{ expandedInsights().has(insight.id) ? 'bi-chevron-up' : 'bi-chevron-down' }}"></i>
                  Details
                </button>
              </div>

              @if (expandedInsights().has(insight.id)) {
                <div class="bi-insight-expanded">
                  <div class="bi-expanded-section">
                    <h4><i class="bi bi-check-circle"></i> Recommendations</h4>
                    <ol>
                      @for (rec of insight.recommendations; track rec) {
                        <li>{{ rec }}</li>
                      }
                    </ol>
                  </div>
                  <div class="bi-expanded-section">
                    <h4><i class="bi bi-graph-up"></i> Related Metrics</h4>
                    <div class="bi-related-metrics">
                      @for (m of insight.relatedMetrics; track m) {
                        <span class="bi-metric-tag">{{ m }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Category Performance -->
      <div class="bi-section">
        <h2 class="bi-section-title"><i class="bi bi-grid"></i> Category Performance</h2>
        <div class="bi-table-container">
          <table class="bi-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Revenue</th>
                <th>Orders</th>
                <th>AOV</th>
                <th>CVR</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              @for (cat of categoryPerformance(); track cat.category) {
                <tr>
                  <td><strong>{{ cat.category }}</strong></td>
                  <td>₹{{ (cat.revenue / 100000).toFixed(1) }}L</td>
                  <td>{{ cat.orders }}</td>
                  <td>₹{{ cat.avgOrderValue.toLocaleString() }}</td>
                  <td>{{ cat.conversionRate }}%</td>
                  <td>
                    <span class="bi-trend-badge" [class]="cat.trend">
                      <i class="bi {{ trendIcon(cat.trend) }}"></i>
                      {{ cat.trendValue > 0 ? '+' : '' }}{{ cat.trendValue }}%
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Product Recommendations -->
      <div class="bi-section">
        <h2 class="bi-section-title"><i class="bi bi-star"></i> Product Promotion Candidates</h2>
        <div class="bi-product-grid">
          @for (prod of promoteProducts(); track prod.sku) {
            <div class="bi-product-card bi-product-promote">
              <div class="bi-product-header">
                <span class="bi-product-rec promote">PROMOTE</span>
                <span class="bi-product-category">{{ prod.category }}</span>
              </div>
              <h4 class="bi-product-name">{{ prod.name }}</h4>
              <div class="bi-product-metrics">
                <div class="bi-pmetric"><span class="bi-pmetric-value">{{ prod.conversionRate }}%</span><span class="bi-pmetric-label">CVR</span></div>
                <div class="bi-pmetric"><span class="bi-pmetric-value">{{ prod.roas }}x</span><span class="bi-pmetric-label">ROAS</span></div>
                <div class="bi-pmetric"><span class="bi-pmetric-value">{{ prod.orders }}</span><span class="bi-pmetric-label">Orders</span></div>
                <div class="bi-pmetric"><span class="bi-pmetric-value">{{ prod.inventory }}</span><span class="bi-pmetric-label">Stock</span></div>
              </div>
              <div class="bi-product-sku">SKU: {{ prod.sku }}</div>
            </div>
          }
        </div>
      </div>

      <!-- Products to Discount/Discontinue -->
      <div class="bi-section">
        <h2 class="bi-section-title"><i class="bi bi-tag"></i> Inventory Actions Needed</h2>
        <div class="bi-action-grid">
          @for (prod of discountProducts(); track prod.sku) {
            <div class="bi-action-card discount">
              <span class="bi-action-badge discount">DISCOUNT</span>
              <strong>{{ prod.name }}</strong>
              <div class="bi-action-meta">
                <span>CVR: {{ prod.conversionRate }}%</span>
                <span>ROAS: {{ prod.roas }}x</span>
                <span>Stock: {{ prod.inventory }}</span>
              </div>
            </div>
          }
          @for (prod of discontinueProducts(); track prod.sku) {
            <div class="bi-action-card discontinue">
              <span class="bi-action-badge discontinue">DISCONTINUE</span>
              <strong>{{ prod.name }}</strong>
              <div class="bi-action-meta">
                <span>CVR: {{ prod.conversionRate }}%</span>
                <span>ROAS: {{ prod.roas }}x</span>
                <span>Stock: {{ prod.inventory }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './business-intelligence.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessIntelligenceComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly service = inject(BusinessIntelligenceService);

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('channelChart') channelChartRef!: ElementRef<HTMLDivElement>;

  readonly insights = computed(() => this.service.insights());
  readonly kpis = computed(() => this.service.kpis());
  readonly categoryPerformance = computed(() => this.service.categoryPerformance());
  readonly productPerformance = computed(() => this.service.productPerformance());
  readonly revenueTrend = computed(() => this.service.revenueTrend());
  readonly channelPerformance = computed(() => this.service.channelPerformance());

  readonly criticalInsights = computed(() => this.service.criticalInsights());
  readonly warningInsights = computed(() => this.service.warningInsights());
  readonly successInsights = computed(() => this.service.successInsights());
  readonly infoInsights = computed(() => this.service.infoInsights());
  readonly promoteProducts = computed(() => this.service.promoteProducts());
  readonly discountProducts = computed(() => this.service.discountProducts());
  readonly discontinueProducts = computed(() => this.service.discontinueProducts());

  activeSeverity = signal<'critical' | 'warning' | 'info' | 'success' | 'all'>('all');
  expandedInsights = signal<Set<string>>(new Set());
  severities = ['critical', 'warning', 'success', 'info'] as const;

  ngOnInit(): void {
    setTimeout(() => this.renderCharts(), 100);
  }

  filteredInsights = computed(() => {
    const sev = this.activeSeverity();
    if (sev === 'all') return this.insights();
    return this.insights().filter(i => i.severity === sev);
  });

  insightCount(sev: string): number {
    return this.insights().filter(i => i.severity === sev).length;
  }

  categoryColor(category: string): string {
    return INSIGHT_CATEGORIES.find(c => c.value === category)?.color ?? '#0f6f84';
  }

  categoryIcon(category: string): string {
    return INSIGHT_CATEGORIES.find(c => c.value === category)?.icon ?? 'bi-lightbulb';
  }

  kpiIcon(id: string): string {
    const icons: Record<string, string> = {
      'kpi-1': 'bi-currency-rupee',
      'kpi-2': 'bi-cart-check',
      'kpi-3': 'bi-cash-stack',
      'kpi-4': 'bi-graph-up-arrow',
      'kpi-5': 'bi-person-plus',
      'kpi-6': 'bi-person-check',
      'kpi-7': 'bi-credit-card',
      'kpi-8': 'bi-bar-chart-line',
      'kpi-9': 'bi-envelope',
      'kpi-10': 'bi-chat-dots',
    };
    return icons[id] ?? 'bi-graph-up';
  }

  trendIcon(trend: 'up' | 'down' | 'neutral'): string {
    return trend === 'up' ? 'bi-arrow-up-right' : trend === 'down' ? 'bi-arrow-down-right' : 'bi-dash';
  }

  toggleInsight(id: string): void {
    this.expandedInsights.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  refresh(): void {
    this.service.refresh();
    this.expandedInsights.set(new Set());
    this.renderCharts();
    this.toast.success('Business intelligence data refreshed');
  }

  private renderCharts(): void {
    this.renderRevenueChart();
    this.renderChannelChart();
  }

  private renderRevenueChart(): void {
    const el = this.revenueChartRef?.nativeElement;
    if (!el) return;
    const data = this.revenueTrend();
    const max = Math.max(...data.map(d => d.value));
    const width = el.offsetWidth - 40;
    const height = 200;
    const barWidth = width / data.length * 0.6;
    const gap = width / data.length * 0.4;

    el.innerHTML = `
      <svg width="${width + 40}" height="${height + 40}" style="font-family: 'DM Sans', sans-serif;">
        ${data.map((d, i) => {
          const barHeight = (d.value / max) * height;
          const x = 40 + i * (barWidth + gap) + gap / 2;
          const y = height - barHeight + 20;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#0f6f84" rx="4" />
            <text x="${x + barWidth / 2}" y="${height + 35}" text-anchor="middle" font-size="10" fill="#6b7280">${d.label}</text>
            <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="#0c4a58" font-weight="600">₹${(d.value / 100000).toFixed(1)}L</text>
          `;
        }).join('')}
      </svg>
    `;
  }

  private renderChannelChart(): void {
    const el = this.channelChartRef?.nativeElement;
    if (!el) return;
    const data = this.channelPerformance();
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = ['#0f6f84', '#c9a54c', '#b91c1c', '#7c3aed', '#059669', '#db2777'];

    let html = `<svg width="${el.offsetWidth}" height="220" style="font-family: 'DM Sans', sans-serif;">`;
    let y = 20;
    data.forEach((d, i) => {
      const pct = (d.value / total) * 100;
      const barWidth = Math.max((el.offsetWidth - 160) * (pct / 100), 40);
      html += `
        <text x="10" y="${y + 14}" font-size="11" fill="#374151" font-weight="600">${d.label}</text>
        <rect x="120" y="${y + 4}" width="${barWidth}" height="20" fill="${colors[i % colors.length]}" rx="4" />
        <text x="${120 + barWidth + 8}" y="${y + 17}" font-size="11" fill="#6b7280">₹${(d.value / 100000).toFixed(1)}L (${pct.toFixed(0)}%)</text>
      `;
      y += 30;
    });
    html += `</svg>`;
    el.innerHTML = html;
  }
}