import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';

interface Kpi {
  key: string;
  label: string;
  value: number;
  trend: number;
  icon: string;
  theme: string;
  spark: number[];
}

interface MonthlyPoint {
  month: string;
  value: number;
}

interface PlatformShare {
  name: string;
  pct: number;
  color: string;
  icon: string;
}

interface ExpertItem {
  name: string;
  confidence: number;
}

interface QueueItem {
  task: string;
  status: 'queued' | 'running' | 'done' | 'error';
  meta: string;
}

interface PillarItem {
  label: string;
  value: number;
}

interface ProviderHealth {
  name: string;
  state: 'operational' | 'degraded' | 'maintenance';
  uptime: number;
}

interface CostItem {
  provider: string;
  cost: number;
  pct: number;
}

interface ContentTypeItem {
  name: string;
  icon: string;
  count: number;
  pct: number;
}

interface CampaignMetric {
  name: string;
  channel: string;
  status: string;
  reach: string;
  ctr: string;
  conv: string;
  spend: number;
  progress: number;
}

interface ActivityItem {
  time: string;
  text: string;
  icon: string;
  color: string;
}

interface DraftItem {
  title: string;
  platform: string;
  updated: string;
}

@Component({
  selector: 'app-marketing-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="md-page cc-page">
      <div class="md-header">
        <div class="cc-title-row">
          <div>
            <h1 class="md-title"><i class="bi bi-cpu-fill cc-title-icon"></i> AI Growth Engine</h1>
            <p class="md-desc">Command center — intelligence, generation queues, provider health and campaign performance across every platform.</p>
          </div>
          <div class="cc-header-actions">
            <span class="cc-live-badge"><span class="cc-dot"></span> Engine Live</span>
            <span class="cc-period">Last 30 days</span>
          </div>
        </div>
        <div class="md-quick-links">
          <a routerLink="/marketing/ceo-dashboard" class="md-quick-link"><i class="bi bi-award"></i> CEO Dashboard</a>
          <a routerLink="/marketing/brain" class="md-quick-link"><i class="bi bi-cpu"></i> AI Brain</a>
          <a routerLink="/marketing/memory" class="md-quick-link"><i class="bi bi-database-gear"></i> AI Memory</a>
          <a routerLink="/marketing/agents" class="md-quick-link"><i class="bi bi-robot"></i> AI Agents</a>
          <a routerLink="/marketing/pipeline" class="md-quick-link"><i class="bi bi-diagram-3"></i> Pipeline</a>
          <a routerLink="/marketing/orchestrator" class="md-quick-link"><i class="bi bi-mindmap"></i> Orchestrator</a>
          <a routerLink="/marketing/generation" class="md-quick-link"><i class="bi bi-stack"></i> Multi-Step Gen</a>
          <a routerLink="/marketing/image-director" class="md-quick-link"><i class="bi bi-image"></i> Image Director</a>
          <a routerLink="/marketing/reviewer" class="md-quick-link"><i class="bi bi-clipboard2-check"></i> AI Reviewer</a>
          <a routerLink="/marketing/providers" class="md-quick-link"><i class="bi bi-hdd-network"></i> Providers</a>
          <a routerLink="/marketing/ai-orchestrator" class="md-quick-link"><i class="bi bi-diagram-3-fill"></i> AI Orchestrator</a>
          <a routerLink="/marketing/pipeline-designer" class="md-quick-link"><i class="bi bi-diagram-2"></i> Pipeline Designer</a>
          <a routerLink="/marketing/campaign-generator" class="md-quick-link"><i class="bi bi-megaphone"></i> Campaign Gen</a>
          <a routerLink="/marketing/prompt-studio" class="md-quick-link"><i class="bi bi-camera"></i> Image Studio</a>
          <a routerLink="/marketing/fashion-knowledge" class="md-quick-link"><i class="bi bi-book"></i> Knowledge</a>
          <a routerLink="/marketing/calendar" class="md-quick-link"><i class="bi bi-calendar3"></i> Calendar</a>
          <a routerLink="/marketing/queue" class="md-quick-link"><i class="bi bi-list-task"></i> Queue</a>
          <a routerLink="/marketing/cost" class="md-quick-link"><i class="bi bi-currency-dollar"></i> Cost</a>
          <a routerLink="/marketing/review" class="md-quick-link"><i class="bi bi-clipboard-check"></i> Review</a>
          <a routerLink="/marketing/trend-analysis" class="md-quick-link"><i class="bi bi-graph-up"></i> Trend Analysis</a>
          <a routerLink="/marketing/content-planner" class="md-quick-link"><i class="bi bi-lightbulb"></i> Content Planner</a>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="row g-3">
        @for (k of kpis(); track k.key) {
          <div class="col-6 col-md-3">
            <div class="cc-card cc-kpi">
              <div class="cc-kpi-top">
                <span class="cc-kpi-icon" [style.background]="k.theme + '18'" [style.color]="k.theme">
                  <i class="bi {{ k.icon }}"></i>
                </span>
                <span class="cc-kpi-trend" [class.cc-trend-up]="k.trend >= 0" [class.cc-trend-down]="k.trend < 0">
                  <i class="bi {{ k.trend >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right' }}"></i>
                  {{ k.trend >= 0 ? '+' : '' }}{{ k.trend }}%
                </span>
              </div>
              <div class="cc-kpi-value">{{ k.value | number }}</div>
              <div class="cc-kpi-label">{{ k.label }}</div>
              <div class="cc-kpi-spark">
                @for (h of k.spark; track $index) {
                  <span [style.height.%]="h" [style.background]="k.theme"></span>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Performance charts -->
      <div class="row g-3 mt-1">
        <div class="col-lg-7">
          <div class="cc-card cc-chart-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-graph-up-arrow"></i> Monthly Growth</h5>
              <span class="cc-card-sub">Content generated per month</span>
            </div>
            <div class="cc-bar-chart">
              @for (b of monthlyGrowth(); track b.month) {
                <div class="cc-bar-col">
                  <div class="cc-bar-track">
                    <div class="cc-bar" [style.height.%]="barHeight(b.value)">
                      <span class="cc-bar-value">{{ b.value }}</span>
                    </div>
                  </div>
                  <span class="cc-bar-month">{{ b.month }}</span>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="cc-card cc-chart-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-pie-chart"></i> Platform Distribution</h5>
              <span class="cc-card-sub">Share of generated content</span>
            </div>
            <div class="cc-donut-wrap">
              <div class="cc-donut" [style.background]="donutGradient()">
                <div class="cc-donut-hole">
                  <span class="cc-donut-value">1,248</span>
                  <span class="cc-donut-label">Total</span>
                </div>
              </div>
              <div class="cc-legend">
                @for (p of platformShares(); track p.name) {
                  <div class="cc-legend-item">
                    <span class="cc-legend-dot" [style.background]="p.color"></span>
                    <i class="bi {{ p.icon }}"></i>
                    <span class="cc-legend-name">{{ p.name }}</span>
                    <span class="cc-legend-pct">{{ p.pct }}%</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Intelligence core -->
      <div class="row g-3 mt-1">
        <div class="col-lg-4">
          <div class="cc-card cc-eng">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-cpu"></i> AI Brain</h5>
              <a routerLink="/marketing/brain" class="cc-widget-link">Open <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-eng-top">
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ brain().experts }}</span>
                <span class="cc-eng-label">Experts</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ brain().confidence }}%</span>
                <span class="cc-eng-label">Avg Confidence</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ brain().updated }}</span>
                <span class="cc-eng-label">Updated</span>
              </div>
            </div>
            <div class="cc-expert-list">
              @for (e of brain().expertList; track e.name) {
                <div class="cc-bar-item">
                  <div class="cc-bar-item-head">
                    <span><i class="bi bi-person-badge"></i> {{ e.name }}</span>
                    <span class="cc-bar-item-num">{{ e.confidence }}%</span>
                  </div>
                  <div class="progress cc-progress">
                    <div class="progress-bar" [style.width.%]="e.confidence"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card cc-eng">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-database-gear"></i> Memory</h5>
              <a routerLink="/marketing/memory" class="cc-widget-link">Open <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-eng-top">
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ memory().entries | number }}</span>
                <span class="cc-eng-label">Entries</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ memory().categories }}</span>
                <span class="cc-eng-label">Categories</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ memory().usage }}%</span>
                <span class="cc-eng-label">Capacity</span>
              </div>
            </div>
            <div class="cc-kb-footer"><i class="bi bi-clock-history"></i> Last recall {{ memory().lastRecall }}</div>
            <div class="cc-bar-list">
              @for (m of memory().recent; track m.label) {
                <div class="cc-bar-item">
                  <div class="cc-bar-item-head">
                    <span>{{ m.label }}</span>
                    <span class="cc-bar-item-num">{{ m.value }}</span>
                  </div>
                  <div class="progress cc-progress">
                    <div class="progress-bar" [style.width.%]="m.value"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card cc-eng">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-robot"></i> Agents</h5>
              <a routerLink="/marketing/agents" class="cc-widget-link">Open <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-eng-top">
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ agents().active }}/{{ agents().total }}</span>
                <span class="cc-eng-label">Active</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ agents().avgTemp }}</span>
                <span class="cc-eng-label">Avg Temp</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ agents().workload }}%</span>
                <span class="cc-eng-label">Workload</span>
              </div>
            </div>
            <div class="cc-progress mb-2">
              <div class="progress-bar" [style.width.%]="agents().workload"></div>
            </div>
            <div class="cc-timeline">
              @for (a of agents().latest; track a.text) {
                <div class="cc-timeline-item">
                  <span class="cc-timeline-dot" [style.background]="a.color"></span>
                  <div class="cc-timeline-body">
                    <p class="cc-timeline-text">{{ a.text }}</p>
                    <span class="cc-timeline-time">{{ a.time }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Execution queues -->
      <div class="row g-3 mt-1">
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-diagram-3"></i> Campaign Pipeline</h5>
              <a routerLink="/marketing/pipeline" class="cc-widget-link">Open <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-pipeline-head">
              <span class="cc-pipeline-state">{{ pipeline().state }}</span>
              <span class="cc-pipeline-pct">{{ pipeline().overall }}%</span>
            </div>
            <div class="cc-progress mb-2">
              <div class="progress-bar" [style.width.%]="pipeline().overall"></div>
            </div>
            <div class="cc-stage-chips">
              @for (st of pipeline().stages; track st.name; let i = $index) {
                <span class="cc-stage-chip"
                  [class.cc-stage-done]="st.state === 'done'"
                  [class.cc-stage-current]="st.state === 'current'">
                  <i class="bi {{ st.state === 'done' ? 'bi-check2' : st.state === 'current' ? 'bi-gear-fill' : 'bi-circle' }}"></i>
                  <span>{{ st.name }}</span>
                </span>
                @if (!isStageLast(i)) { <span class="cc-stage-conn"></span> }
              }
            </div>
            <div class="cc-kb-footer"><i class="bi bi-activity"></i> Stage {{ pipeline().current }}/{{ pipeline().stages.length }} running · retries {{ pipeline().retries }}</div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-mindmap"></i> Prompt Queue</h5>
              <span class="cc-card-sub">{{ queueCount('prompt') }} jobs</span>
            </div>
            <div class="cc-queue-list">
              @for (q of promptQueue(); track q.task) {
                <div class="cc-queue-row">
                  <span class="cc-queue-status" [class]="'cc-qs-' + q.status">
                    @if (q.status === 'running') { <span class="cc-spinner"></span> }
                    @else { <i class="bi {{ queueIcon(q.status) }}"></i> }
                  </span>
                  <div class="cc-queue-body">
                    <span class="cc-queue-task">{{ q.task }}</span>
                    <span class="cc-queue-meta">{{ q.meta }}</span>
                  </div>
                  <span class="cc-queue-badge" [class]="'cc-qs-' + q.status">{{ q.status }}</span>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-image"></i> Image Queue</h5>
              <span class="cc-card-sub">{{ queueCount('image') }} jobs</span>
            </div>
            <div class="cc-queue-list">
              @for (q of imageQueue(); track q.task) {
                <div class="cc-queue-row">
                  <span class="cc-queue-status" [class]="'cc-qs-' + q.status">
                    @if (q.status === 'running') { <span class="cc-spinner"></span> }
                    @else { <i class="bi {{ queueIcon(q.status) }}"></i> }
                  </span>
                  <div class="cc-queue-body">
                    <span class="cc-queue-task">{{ q.task }}</span>
                    <span class="cc-queue-meta">{{ q.meta }}</span>
                  </div>
                  <span class="cc-queue-badge" [class]="'cc-qs-' + q.status">{{ q.status }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Content queue + health + costs -->
      <div class="row g-3 mt-1">
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-file-earmark-text"></i> Content Queue</h5>
              <span class="cc-card-sub">{{ queueCount('content') }} jobs</span>
            </div>
            <div class="cc-queue-list">
              @for (q of contentQueue(); track q.task) {
                <div class="cc-queue-row">
                  <span class="cc-queue-status" [class]="'cc-qs-' + q.status">
                    @if (q.status === 'running') { <span class="cc-spinner"></span> }
                    @else { <i class="bi {{ queueIcon(q.status) }}"></i> }
                  </span>
                  <div class="cc-queue-body">
                    <span class="cc-queue-task">{{ q.task }}</span>
                    <span class="cc-queue-meta">{{ q.meta }}</span>
                  </div>
                  <span class="cc-queue-badge" [class]="'cc-qs-' + q.status">{{ q.status }}</span>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-heart-pulse"></i> Brand Health</h5>
              <span class="cc-card-sub">Voice & identity score</span>
            </div>
            <div class="cc-score-wrap">
              <div class="cc-score-ring" [style.background]="brandGradient()">
                <div class="cc-score-hole">
                  <span class="cc-score-value">{{ brandHealth().overall }}</span>
                  <span class="cc-score-label">/ 100</span>
                </div>
              </div>
            </div>
            <div class="cc-bar-list">
              @for (p of brandHealth().pillars; track p.label) {
                <div class="cc-bar-item">
                  <div class="cc-bar-item-head">
                    <span>{{ p.label }}</span>
                    <span class="cc-bar-item-num">{{ p.value }}</span>
                  </div>
                  <div class="progress cc-progress">
                    <div class="progress-bar" [style.width.%]="p.value"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-hdd-network"></i> Provider Health</h5>
              <a routerLink="/marketing/providers" class="cc-widget-link">Manage <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-status-list">
              @for (s of providerHealth(); track s.name) {
                <div class="cc-status-row">
                  <span class="cc-status-dot" [class.cc-status-ok]="s.state === 'operational'" [class.cc-status-warn]="s.state === 'degraded'" [class.cc-status-maint]="s.state === 'maintenance'"></span>
                  <span class="cc-status-name">{{ s.name }}</span>
                  <span class="cc-status-up">{{ s.uptime }}%</span>
                  <span class="cc-status-badge" [class.cc-status-badge-ok]="s.state === 'operational'" [class.cc-status-badge-warn]="s.state === 'degraded'" [class.cc-status-badge-maint]="s.state === 'maintenance'">
                    {{ s.state }}
                  </span>
                </div>
              }
            </div>
            <div class="cc-kb-footer"><i class="bi bi-check-circle"></i> {{ providerHealthOk() }} of {{ providerHealth().length }} reporting normally</div>
          </div>
        </div>
      </div>

      <!-- Costs + knowledge + generated content -->
      <div class="row g-3 mt-1">
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-currency-dollar"></i> AI Costs</h5>
              <a routerLink="/marketing/cost" class="cc-widget-link">Details <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-cost-top">
              <div class="cc-cost-budget">
                <div class="cc-cost-ring" [style.background]="costGradient()">
                  <div class="cc-cost-hole">
                    <span class="cc-cost-value">{{ aiCosts().budgetPct }}%</span>
                    <span class="cc-cost-label">Budget</span>
                  </div>
                </div>
              </div>
              <div class="cc-cost-nums">
                <div class="cc-cost-num"><span class="cc-cost-num-value">\${{ aiCosts().today }}</span><span class="cc-cost-num-label">Today</span></div>
                <div class="cc-cost-num"><span class="cc-cost-num-value">\${{ aiCosts().month }}</span><span class="cc-cost-num-label">This Month</span></div>
                <div class="cc-cost-num"><span class="cc-cost-num-value">\${{ aiCosts().budget }}</span><span class="cc-cost-num-label">Monthly Cap</span></div>
              </div>
            </div>
            <div class="cc-bar-list">
              @for (c of aiCosts().breakdown; track c.provider) {
                <div class="cc-bar-item">
                  <div class="cc-bar-item-head">
                    <span>{{ c.provider }}</span>
                    <span class="cc-bar-item-num">\${{ c.cost }} · {{ c.pct }}%</span>
                  </div>
                  <div class="progress cc-progress cc-progress-gold">
                    <div class="progress-bar" [style.width.%]="c.pct"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-book"></i> Knowledge Base</h5>
              <a routerLink="/marketing/fashion-knowledge" class="cc-widget-link">Browse <i class="bi bi-arrow-right"></i></a>
            </div>
            <div class="cc-kb-stats">
              @for (s of knowledgeStats(); track s.label) {
                <div class="cc-kb-stat">
                  <span class="cc-kb-value">{{ s.value }}</span>
                  <span class="cc-kb-label">{{ s.label }}</span>
                </div>
              }
            </div>
            <div class="cc-kb-footer"><i class="bi bi-clock-history"></i> Last synced {{ knowledgeSynced() }}</div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-collection"></i> Generated Content</h5>
              <span class="cc-card-sub">Avg score {{ generated().avgScore }}</span>
            </div>
            <div class="cc-eng-top">
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ generated().total | number }}</span>
                <span class="cc-eng-label">Total</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ generated().avgScore }}</span>
                <span class="cc-eng-label">Avg Score</span>
              </div>
              <div class="cc-eng-stat">
                <span class="cc-eng-value">{{ generated().approved }}%</span>
                <span class="cc-eng-label">Approved</span>
              </div>
            </div>
            <div class="cc-bar-list">
              @for (t of generated().types; track t.name) {
                <div class="cc-bar-item">
                  <div class="cc-bar-item-head">
                    <span><i class="bi {{ t.icon }}"></i> {{ t.name }}</span>
                    <span class="cc-bar-item-num">{{ t.count }}</span>
                  </div>
                  <div class="progress cc-progress">
                    <div class="progress-bar" [style.width.%]="t.pct"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Campaign performance + recent activity -->
      <div class="row g-3 mt-1">
        <div class="col-lg-8">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-megaphone"></i> Campaign Performance</h5>
              <span class="cc-card-sub">Live & recent campaigns</span>
            </div>
            <div class="cc-perf">
              <div class="cc-perf-head">
                <span class="cc-perf-col cc-perf-name">Campaign</span>
                <span class="cc-perf-col">Reach</span>
                <span class="cc-perf-col">CTR</span>
                <span class="cc-perf-col">Conv</span>
                <span class="cc-perf-col">Spend</span>
                <span class="cc-perf-col cc-perf-prog">Progress</span>
                <span class="cc-perf-col cc-perf-status">Status</span>
              </div>
              @for (c of campaignPerformance(); track c.name) {
                <div class="cc-perf-row">
                  <span class="cc-perf-col cc-perf-name">
                    <span class="cc-perf-cname">{{ c.name }}</span>
                    <span class="cc-perf-cmeta"><i class="bi {{ platformIcon(c.channel) }}"></i> {{ c.channel }}</span>
                  </span>
                  <span class="cc-perf-col">{{ c.reach }}</span>
                  <span class="cc-perf-col">{{ c.ctr }}</span>
                  <span class="cc-perf-col">{{ c.conv }}</span>
                  <span class="cc-perf-col">\${{ c.spend | number }}</span>
                  <span class="cc-perf-col cc-perf-prog">
                    <span class="cc-progress cc-perf-bar"><span class="progress-bar" [style.width.%]="c.progress"></span></span>
                    <span class="cc-perf-pct">{{ c.progress }}%</span>
                  </span>
                  <span class="cc-perf-col cc-perf-status">
                    <span class="cc-campaign-status" [class.cc-status-live]="c.status === 'Live'" [class.cc-status-scheduled]="c.status === 'Scheduled'" [class.cc-status-ended]="c.status === 'Ended'">{{ c.status }}</span>
                  </span>
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-activity"></i> Recent Activity</h5>
              <span class="cc-card-sub">Generation events</span>
            </div>
            <div class="cc-timeline">
              @for (a of aiActivity(); track $index) {
                <div class="cc-timeline-item">
                  <span class="cc-timeline-dot" [style.background]="a.color"></span>
                  <div class="cc-timeline-body">
                    <p class="cc-timeline-text">{{ a.text }}</p>
                    <span class="cc-timeline-time">{{ a.time }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="row g-3 mt-1">
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-lightning-charge"></i> Quick Generate</h5>
              <span class="cc-card-sub">Generate on the fly</span>
            </div>
            <div class="cc-quick-form">
              <div class="cc-field">
                <label class="cc-label">Platform</label>
                <select class="form-select cc-select" [(ngModel)]="qPlatform">
                  @for (p of quickPlatforms; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
              <div class="cc-field">
                <label class="cc-label">Content Type</label>
                <select class="form-select cc-select" [(ngModel)]="qType">
                  <option value="Post">Post</option>
                  <option value="Reel Script">Reel Script</option>
                  <option value="Hashtags">Hashtags</option>
                  <option value="Product Description">Product Description</option>
                </select>
              </div>
              <div class="cc-field">
                <label class="cc-label">Topic / Product</label>
                <input class="form-control cc-select" [(ngModel)]="qTopic" placeholder="e.g. Silk Kurta Set" />
              </div>
              <div class="cc-field">
                <label class="cc-label">Tone</label>
                <select class="form-select cc-select" [(ngModel)]="qTone">
                  <option value="Luxury">Luxury</option>
                  <option value="Casual">Casual</option>
                  <option value="Festive">Festive</option>
                  <option value="Elegant">Elegant</option>
                </select>
              </div>
              <button class="btn cc-btn-primary w-100" (click)="quickGenerate()" [disabled]="qLoading()">
                @if (qLoading()) {
                  <i class="bi bi-arrow-repeat spin"></i> Generating...
                } @else {
                  <i class="bi bi-lightning-charge"></i> Generate Now
                }
              </button>
              @if (qMsg()) {
                <div class="cc-qmsg"><i class="bi bi-check-circle-fill"></i> {{ qMsg() }}</div>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-terminal"></i> Quick Prompt</h5>
              <span class="cc-card-sub">Build a structured prompt</span>
            </div>
            <div class="cc-quick-form">
              <div class="cc-field">
                <label class="cc-label">Prompt Goal</label>
                <input class="form-control cc-select" [(ngModel)]="qpGoal" placeholder="e.g. Festive anarkali caption" />
              </div>
              <div class="cc-field">
                <label class="cc-label">Target Platform</label>
                <select class="form-select cc-select" [(ngModel)]="qPlatform">
                  @for (p of quickPlatforms; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
              <button class="btn cc-btn-primary w-100" (click)="quickPrompt()" [disabled]="!qpGoal().trim()">
                <i class="bi bi-magic"></i> Build Prompt
              </button>
              @if (qpResult()) {
                <pre class="cc-prompt-preview">{{ qpResult() }}</pre>
                <button class="btn cc-btn-secondary w-100" (click)="copyPrompt()"><i class="bi bi-clipboard"></i> Copy Prompt</button>
              }
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="cc-card">
            <div class="cc-card-head">
              <h5 class="cc-card-title"><i class="bi bi-megaphone"></i> Quick Campaign</h5>
              <span class="cc-card-sub">Launch a campaign instantly</span>
            </div>
            <div class="cc-quick-form">
              <div class="cc-field">
                <label class="cc-label">Campaign Name</label>
                <input class="form-control cc-select" [(ngModel)]="qcName" placeholder="e.g. Rakhi Gift Guide" />
              </div>
              <div class="cc-field">
                <label class="cc-label">Channel</label>
                <select class="form-select cc-select" [(ngModel)]="qcChannel">
                  @for (p of quickPlatforms; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
              <div class="cc-field">
                <label class="cc-label">Budget</label>
                <input class="form-control cc-select" [(ngModel)]="qcBudget" placeholder="e.g. 2500" />
              </div>
              <button class="btn cc-btn-primary w-100" (click)="quickCampaign()" [disabled]="!qcName().trim()">
                <i class="bi bi-rocket-takeoff"></i> Launch Campaign
              </button>
              @if (qcMsg()) {
                <div class="cc-qmsg"><i class="bi bi-check-circle-fill"></i> {{ qcMsg() }}</div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './marketing-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingDashboardComponent {
  private readonly toast = inject(ToastService);

  readonly quickPlatforms = ['Instagram', 'Facebook', 'Pinterest', 'WhatsApp', 'Website Blog', 'Flipkart'];

  readonly qPlatform = signal('Instagram');
  readonly qType = signal('Post');
  readonly qTopic = signal('');
  readonly qTone = signal('Luxury');
  readonly qLoading = signal(false);
  readonly qMsg = signal('');

  readonly qpGoal = signal('');
  readonly qpResult = signal('');

  readonly qcName = signal('');
  readonly qcChannel = signal('Instagram');
  readonly qcBudget = signal('');
  readonly qcMsg = signal('');

  readonly kpis = signal<Kpi[]>([
    { key: 'content', label: 'Content Generated', value: 1248, trend: 18, icon: 'bi-lightning-charge', theme: '#0f6f84', spark: [42, 48, 45, 58, 62, 60, 71, 78] },
    { key: 'campaigns', label: 'Active Campaigns', value: 36, trend: 9, icon: 'bi-megaphone', theme: '#c9a54c', spark: [50, 52, 48, 55, 60, 66, 68, 74] },
    { key: 'assets', label: 'Brand Assets', value: 214, trend: 12, icon: 'bi-collection', theme: '#8b5cf6', spark: [38, 44, 46, 52, 55, 60, 64, 70] },
    { key: 'queue', label: 'AI Queue', value: 8, trend: -22, icon: 'bi-list-task', theme: '#ef4444', spark: [80, 70, 74, 60, 52, 46, 40, 34] },
  ]);

  readonly monthlyGrowth = signal<MonthlyPoint[]>([
    { month: 'Jan', value: 320 },
    { month: 'Feb', value: 380 },
    { month: 'Mar', value: 415 },
    { month: 'Apr', value: 470 },
    { month: 'May', value: 540 },
    { month: 'Jun', value: 610 },
    { month: 'Jul', value: 720 },
    { month: 'Aug', value: 840 },
  ]);

  readonly platformShares = signal<PlatformShare[]>([
    { name: 'Instagram', pct: 34, color: '#0f6f84', icon: 'bi-instagram' },
    { name: 'Facebook', pct: 21, color: '#3b82f6', icon: 'bi-facebook' },
    { name: 'Pinterest', pct: 15, color: '#ef4444', icon: 'bi-pinterest' },
    { name: 'WhatsApp', pct: 13, color: '#22c55e', icon: 'bi-whatsapp' },
    { name: 'Website Blog', pct: 9, color: '#c9a54c', icon: 'bi-journal-text' },
    { name: 'Flipkart', pct: 8, color: '#8b5cf6', icon: 'bi-bag' },
  ]);

  readonly brain = signal({
    experts: 8,
    confidence: 88,
    updated: '2h ago',
    expertList: [
      { name: 'Brand Architect', confidence: 94 },
      { name: 'Fashion Consultant', confidence: 91 },
      { name: 'Copywriting Lead', confidence: 90 },
      { name: 'SEO Strategist', confidence: 85 },
      { name: 'Trend Analyst', confidence: 79 },
    ] as ExpertItem[],
  });

  readonly memory = signal({
    entries: 384,
    categories: 9,
    usage: 62,
    lastRecall: '2 min ago',
    recent: [
      { label: 'Brand Voice', value: 91 },
      { label: 'Fabric Knowledge', value: 84 },
      { label: 'Festive Calendar', value: 78 },
      { label: 'Campaign Learnings', value: 66 },
    ],
  });

  readonly agents = signal({
    active: 7,
    total: 9,
    avgTemp: 0.6,
    workload: 74,
    latest: [
      { text: 'Prompt Engineer queued 3 image prompts', time: '5 min ago', color: '#0f6f84' },
      { text: 'Creative Director approved 2 carousels', time: '22 min ago', color: '#8b5cf6' },
      { text: 'Trend Analyst flagged festive spikes', time: '1 hr ago', color: '#c9a54c' },
    ],
  });

  readonly pipeline = signal({
    state: 'Running',
    overall: 62,
    current: 5,
    retries: 1,
    stages: [
      { name: 'Research', state: 'done' },
      { name: 'Strategy', state: 'done' },
      { name: 'Prompt', state: 'done' },
      { name: 'Content', state: 'done' },
      { name: 'Image', state: 'current' },
      { name: 'Review', state: 'pending' },
      { name: 'Optimize', state: 'pending' },
      { name: 'Output', state: 'pending' },
    ],
  });

  readonly promptQueue = signal<QueueItem[]>([
    { task: 'Festive Sale — Instagram', status: 'queued', meta: 'Caption · 2 variants' },
    { task: 'Wedding Lookbook — Facebook', status: 'running', meta: 'Carousel · 5 slides' },
    { task: 'Product Desc — Flipkart', status: 'done', meta: 'Silk Kurta Set' },
    { task: 'Email Drip — Festival', status: 'queued', meta: 'Sequence · 3 mails' },
    { task: 'Pinterest Pins — Monsoon', status: 'error', meta: '10 pins' },
  ]);

  readonly imageQueue = signal<QueueItem[]>([
    { task: 'Zari Luxe Hero Shot', status: 'done', meta: '4:5 · Earth tones' },
    { task: 'Anarkali Model Editorial', status: 'running', meta: 'Soft daylight' },
    { task: 'Saree Flat Lay', status: 'queued', meta: '1:1 · Minimal beige' },
    { task: 'Dupatta Detail Crop', status: 'queued', meta: 'Macro 100mm' },
    { task: 'Festive Banner', status: 'error', meta: '9:16 · Retry 2' },
  ]);

  readonly contentQueue = signal<QueueItem[]>([
    { task: 'Reel Script — Monsoon', status: 'done', meta: '45s · Hook A' },
    { task: 'Blog — Styling Guide', status: 'queued', meta: '1,200 words' },
    { task: 'WhatsApp Broadcast', status: 'done', meta: 'Festive offer' },
    { task: 'Landing Page Copy', status: 'queued', meta: 'Anarkali drop' },
    { task: 'Story Template', status: 'done', meta: 'Polls · 3 frames' },
  ]);

  readonly knowledgeStats = signal([
    { value: 42, label: 'Articles' },
    { value: 156, label: 'Terms' },
    { value: 28, label: 'Concepts' },
    { value: 17, label: 'Trends' },
    { value: 9, label: 'Sources' },
  ]);
  readonly knowledgeSynced = signal('2 hours ago');

  readonly brandHealth = signal({
    overall: 84,
    pillars: [
      { label: 'Voice Consistency', value: 91 },
      { label: 'Visual Identity', value: 87 },
      { label: 'Messaging Clarity', value: 82 },
      { label: 'Sentiment', value: 78 },
    ] as PillarItem[],
  });

  readonly providerHealth = signal<ProviderHealth[]>([
    { name: 'OpenAI', state: 'operational', uptime: 99.9 },
    { name: 'Gemini', state: 'operational', uptime: 99.8 },
    { name: 'Claude', state: 'degraded', uptime: 98.4 },
    { name: 'OpenRouter', state: 'degraded', uptime: 97.1 },
    { name: 'Ollama', state: 'operational', uptime: 100 },
    { name: 'LM Studio', state: 'operational', uptime: 99.6 },
  ]);

  readonly aiCosts = signal({
    today: 4.32,
    month: 128.9,
    budget: 250,
    budgetPct: 52,
    breakdown: [
      { provider: 'OpenAI', cost: 58.2, pct: 45 },
      { provider: 'Gemini', cost: 31.4, pct: 24 },
      { provider: 'Claude', cost: 24.1, pct: 19 },
      { provider: 'OpenRouter', cost: 11.2, pct: 9 },
      { provider: 'Others', cost: 4.0, pct: 3 },
    ] as CostItem[],
  });

  readonly generated = signal({
    total: 845,
    avgScore: 87,
    approved: 91,
    types: [
      { name: 'Reels', icon: 'bi-camera-reels', count: 320, pct: 90 },
      { name: 'Carousels', icon: 'bi-layout-three-columns', count: 210, pct: 70 },
      { name: 'Posts', icon: 'bi-image', count: 180, pct: 62 },
      { name: 'Blog Articles', icon: 'bi-journal-text', count: 95, pct: 40 },
      { name: 'Emails', icon: 'bi-envelope-paper', count: 40, pct: 18 },
    ] as ContentTypeItem[],
  });

  readonly campaignPerformance = signal<CampaignMetric[]>([
    { name: 'Wedding Season Push', channel: 'Instagram', status: 'Live', reach: '1.2M', ctr: '3.8%', conv: '6.2%', spend: 840, progress: 72 },
    { name: 'Office Wear Awareness', channel: 'Facebook', status: 'Live', reach: '840K', ctr: '2.9%', conv: '4.1%', spend: 520, progress: 48 },
    { name: 'Monsoon Launch', channel: 'Website Blog', status: 'Scheduled', reach: '—', ctr: '—', conv: '—', spend: 0, progress: 25 },
    { name: 'Festive Flash Sale', channel: 'WhatsApp', status: 'Scheduled', reach: '—', ctr: '—', conv: '—', spend: 0, progress: 10 },
    { name: 'Premium Collection', channel: 'Pinterest', status: 'Ended', reach: '1.5M', ctr: '4.4%', conv: '8.1%', spend: 1200, progress: 100 },
  ]);

  readonly aiActivity = signal<ActivityItem[]>([
    { time: '2 min ago', text: 'Generated Instagram Reel script for "Monsoon Lookbook"', icon: 'bi-camera-reels', color: '#0f6f84' },
    { time: '18 min ago', text: 'Created 15 hashtags for "Handloom Dupatta"', icon: 'bi-hash', color: '#8b5cf6' },
    { time: '1 hr ago', text: 'Wrote Flipkart description for "Silk Kurta Set"', icon: 'bi-bag', color: '#22c55e' },
    { time: '3 hrs ago', text: 'Generated email campaign for "Festival Sale"', icon: 'bi-envelope-paper', color: '#c9a54c' },
    { time: '5 hrs ago', text: 'Drafted blog article "Office Wear Styling Guide"', icon: 'bi-journal-text', color: '#3b82f6' },
  ]);

  readonly recentDrafts = signal<DraftItem[]>([
    { title: 'Silk Kurta Set · Product Description', platform: 'Flipkart', updated: '18 min ago' },
    { title: 'Monsoon Lookbook Reel Script', platform: 'Instagram', updated: '1 hr ago' },
    { title: 'Festival Sale Email', platform: 'Email', updated: '3 hrs ago' },
  ]);

  readonly barHeight = (v: number): number => Math.round((v / 840) * 100);

  readonly donutGradient = (): string => {
    let acc = 0;
    const stops = this.platformShares().map(s => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  };

  readonly brandGradient = (): string =>
    `conic-gradient(#0f6f84 ${this.brandHealth().overall}%, #e6f4f7 0)`;

  readonly costGradient = (): string =>
    `conic-gradient(#c9a54c ${this.aiCosts().budgetPct}%, #eef1f4 0)`;

  readonly providerHealthOk = (): number =>
    this.providerHealth().filter(p => p.state === 'operational').length;

  readonly queueIcon = (status: string): string => {
    return status === 'done' ? 'bi-check2-circle' : status === 'error' ? 'bi-x-circle' : 'bi-clock';
  };

  readonly queueCount = (kind: string): number =>
    kind === 'prompt' ? this.promptQueue().length : kind === 'image' ? this.imageQueue().length : this.contentQueue().length;

  readonly platformIcon = (p: string): string => {
    const map: Record<string, string> = {
      'Instagram': 'bi-instagram',
      'Facebook': 'bi-facebook',
      'Pinterest': 'bi-pinterest',
      'WhatsApp': 'bi-whatsapp',
      'Website Blog': 'bi-journal-text',
      'Email': 'bi-envelope-paper',
      'Flipkart': 'bi-bag',
    };
    return map[p] ?? 'bi-globe';
  };

  isStageLast(i: number): boolean {
    return i >= this.pipeline().stages.length - 1;
  }

  quickGenerate(): void {
    if (this.qLoading()) return;
    this.qLoading.set(true);
    this.qMsg.set('');
    setTimeout(() => {
      const title = `${this.qTopic() || 'New Content'} · ${this.qType()}`;
      this.recentDrafts.update(list => [{ title, platform: this.qPlatform(), updated: 'Just now' }, ...list].slice(0, 4));
      this.aiActivity.update(list => [
        { time: 'Just now', text: `Generated ${this.qType()} for ${this.qPlatform()}`, icon: 'bi-magic', color: '#0f6f84' },
        ...list,
      ].slice(0, 6));
      this.kpis.update(list => list.map(k => (k.key === 'content' ? { ...k, value: k.value + 1 } : k)));
      this.qLoading.set(false);
      this.qMsg.set('Content generated successfully');
    }, 900);
  }

  quickPrompt(): void {
    const goal = this.qpGoal().trim();
    if (!goal) return;
    const prompt = [
      `Platform: ${this.qPlatform()}`,
      `Role: Senior Marketing Copywriter at Vrindaya`,
      `Tone: ${this.qTone()}`,
      `Task: Write engaging ${this.qType().toLowerCase()} content for "${goal}".`,
      `Guidelines:`,
      `  · Open with a strong hook (under 12 words)`,
      `  · Highlight craft, occasion and fabric detail`,
      `  · End with a single clear call-to-action`,
      `  · Keep within the Vrindaya premium-heritage voice`,
      `Output: ready-to-publish copy + 5 hashtags + CTA`,
    ].join('\n');
    this.qpResult.set(prompt);
    this.toast.success('Prompt built');
  }

  async copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.qpResult());
      this.toast.success('Prompt copied to clipboard');
    } catch {
      this.toast.info('Could not access clipboard');
    }
  }

  quickCampaign(): void {
    const name = this.qcName().trim();
    if (!name) return;
    const budget = Number(this.qcBudget()) || 0;
    this.campaignPerformance.update(list => [
      { name, channel: this.qcChannel(), status: 'Live', reach: '—', ctr: '—', conv: '—', spend: budget, progress: 5 },
      ...list,
    ].slice(0, 8));
    this.kpis.update(list => list.map(k => (k.key === 'campaigns' ? { ...k, value: k.value + 1 } : k)));
    this.aiActivity.update(list => [
      { time: 'Just now', text: `Launched campaign "${name}" on ${this.qcChannel()}`, icon: 'bi-megaphone', color: '#c9a54c' },
      ...list,
    ].slice(0, 6));
    this.qcName.set('');
    this.qcBudget.set('');
    this.qcMsg.set(`Campaign "${name}" launched`);
    this.toast.success('Campaign launched');
  }
}
