import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { MarketingStrategistService } from './marketing-strategist.service';
import {
  CAMPAIGN_DURATIONS,
  CAMPAIGN_TYPES,
  PRODUCT_CATEGORIES,
  TARGET_AUDIENCES,
  StrategistInput,
  CampaignPlan,
  CampaignPhase,
} from './models/marketing-strategist.model';

@Component({
  selector: 'app-marketing-strategist',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="ms-page">
      <div class="ms-header">
        <div>
          <h1 class="ms-title"><i class="bi bi-diagram-3"></i> Marketing Strategist</h1>
          <p class="ms-desc">Generate professional campaign plans with phased timelines, activities, and KPIs. Choose duration, type, and let the strategist build the roadmap.</p>
        </div>
        <div class="ms-actions">
          <button class="btn btn-outline-secondary ms-btn" (click)="clearHistory()" [disabled]="history().length === 0">
            <i class="bi bi-trash3"></i> Clear History
          </button>
        </div>
      </div>

      <div class="ms-layout">
        <div class="ms-form-panel">
          <div class="ms-card">
            <div class="ms-card-head">
              <h2 class="ms-card-title"><i class="bi bi-sliders"></i> Campaign Brief</h2>
            </div>
            <form (ngSubmit)="onGenerate()" #briefForm="ngForm">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label ms-label"><i class="bi bi-pencil"></i> Campaign Name</label>
                  <input type="text" class="form-control ms-input" [(ngModel)]="input.campaignName" name="campaignName" placeholder="e.g. Festive Saree Collection Launch" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-tag"></i> Campaign Type</label>
                  <select class="form-select ms-input" [(ngModel)]="input.type" name="type" required>
                    @for (t of campaignTypes; track t.value) {
                      <option [value]="t.value">{{ t.label }}</option>
                    }
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-calendar-range"></i> Duration</label>
                  <select class="form-select ms-input" [(ngModel)]="input.duration" name="duration" required>
                    @for (d of durations; track d.value) {
                      <option [value]="d.value">{{ d.label }} ({{ d.days }} days) </option>
                    }
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-calendar-event"></i> Start Date</label>
                  <input type="date" class="form-control ms-input" [(ngModel)]="input.startDate" name="startDate" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-currency-rupee"></i> Budget (₹)</label>
                  <input type="number" class="form-control ms-input" [(ngModel)]="input.budget" name="budget" placeholder="100000" min="10000" step="10000" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-grid"></i> Product Category</label>
                  <select class="form-select ms-input" [(ngModel)]="input.productCategory" name="productCategory" required>
                    @for (c of productCategories; track c) {
                      <option [value]="c">{{ c }}</option>
                    }
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label ms-label"><i class="bi bi-people"></i> Target Audience</label>
                  <select class="form-select ms-input" [(ngModel)]="input.targetAudience" name="targetAudience" required>
                    @for (a of targetAudiences; track a) {
                      <option [value]="a">{{ a }}</option>
                    }
                  </select>
                </div>

                <div class="col-12">
                  <label class="form-label ms-label"><i class="bi bi-bullseye"></i> Objective</label>
                  <textarea class="form-control ms-input" [(ngModel)]="input.objective" name="objective" rows="2" placeholder="Primary goal for this campaign..."></textarea>
                </div>

                <div class="col-12">
                  <label class="form-label ms-label"><i class="bi bi-chat-quote"></i> Key Message</label>
                  <input type="text" class="form-control ms-input" [(ngModel)]="input.keyMessage" name="keyMessage" placeholder="Core message to communicate...">
                </div>
              </div>
              <div class="ms-form-actions">
                <button type="submit" class="btn ms-btn-primary" [disabled]="loading() || !briefForm.form.valid">
                  @if (loading()) {
                    <span class="ms-spinner"></span> Generating Plan...
                  } @else {
                    <i class="bi bi-magic"></i> Generate Campaign Plan
                  }
                </button>
                <button type="button" class="btn btn-outline-secondary ms-btn" (click)="resetForm()">
                  <i class="bi bi-arrow-counterclockwise"></i> Reset
                </button>
              </div>
            </form>
          </div>

          @if (selectedPlan()) {
            <div class="ms-card ms-summary">
              <div class="ms-card-head">
                <h2 class="ms-card-title"><i class="bi bi-check-circle"></i> Plan Overview</h2>
              </div>
              <div class="ms-overview-grid">
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Duration</span>
                  <strong>{{ durationLabel(selectedPlan()!.duration) }}</strong>
                </div>
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Dates</span>
                  <strong>{{ selectedPlan()!.startDate }} → {{ selectedPlan()!.endDate }}</strong>
                </div>
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Budget</span>
                  <strong>₹{{ selectedPlan()!.budget | number }}</strong>
                </div>
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Phases</span>
                  <strong>{{ selectedPlan()!.phases.length }}</strong>
                </div>
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Activities</span>
                  <strong>{{ totalActivities() }}</strong>
                </div>
                <div class="ms-overview-item">
                  <span class="ms-overview-label">Channels</span>
                  <strong>{{ uniqueChannels() }}</strong>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="ms-timeline-panel">
          @if (selectedPlan()) {
            <div class="ms-card ms-timeline">
              <div class="ms-card-head">
                <h2 class="ms-card-title"><i class="bi bi-gantt"></i> Campaign Timeline</h2>
                <div class="ms-timeline-legend">
                  @for (phase of selectedPlan()!.phases; track phase.id) {
                    <span class="ms-legend-item" [style.border-left-color]="phaseColor(phase)">
                      {{ phase.name }}
                    </span>
                  }
                </div>
              </div>

              <div class="ms-phases">
                @for (phase of selectedPlan()!.phases; track phase.id; let pIdx = $index) {
                  <div class="ms-phase" [style.--phase-color]="phaseColor(phase)">
                    <div class="ms-phase-header">
                      <div class="ms-phase-marker"></div>
                      <div class="ms-phase-info">
                        <h3 class="ms-phase-name">{{ phase.name }}</h3>
                        <p class="ms-phase-desc">{{ phase.description }}</p>
                        <div class="ms-phase-meta">
                          <span class="ms-phase-days">Day {{ phase.startDay }} – {{ phase.endDay }}</span>
                          <span class="ms-phase-owner">{{ phase.owner }}</span>
                          <span class="ms-phase-status" [class]="'ms-status-' + phase.status">{{ phase.status }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="ms-activities">
                      @for (activity of phase.activities; track activity.id; let aIdx = $index) {
                        <div class="ms-activity" [class.ms-activity-last]="aIdx === phase.activities.length - 1">
                          <div class="ms-activity-dot"></div>
                          <div class="ms-activity-line"></div>
                          <div class="ms-activity-content">
                            <div class="ms-activity-header">
                              <span class="ms-activity-day">Day {{ activity.day }}</span>
                              <span class="ms-activity-channel">{{ activity.channel }}</span>
                              <span class="ms-activity-format">{{ activity.format }}</span>
                              <span class="ms-activity-status" [class]="'ms-status-' + activity.status">{{ activity.status }}</span>
                            </div>
                            <h4 class="ms-activity-name">{{ activity.name }}</h4>
                            <p class="ms-activity-desc">{{ activity.description }}</p>
                            <div class="ms-activity-meta">
                              <span class="ms-activity-audience"><i class="bi bi-person"></i> {{ activity.targetAudience }}</span>
                              <span class="ms-activity-budget"><i class="bi bi-currency-rupee"></i> ₹{{ activity.budget | number }}</span>
                            </div>
                          </div>
                        </div>
                      }
                    </div>

                    <div class="ms-deliverables">
                      <strong>Deliverables:</strong>
                      <ul>
                        @for (d of phase.deliverables; track d) {
                          <li>{{ d }}</li>
                        }
                      </ul>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="ms-card ms-kpis">
              <div class="ms-card-head">
                <h2 class="ms-card-title"><i class="bi bi-graph-up"></i> Target KPIs</h2>
              </div>
              <div class="ms-kpi-grid">
                @for (kpi of selectedPlan()!.kpis; track kpi.metric) {
                  <div class="ms-kpi-card">
                    <div class="ms-kpi-metric">{{ kpi.metric }}</div>
                    <div class="ms-kpi-target">{{ kpi.target }} <span class="ms-kpi-unit">{{ kpi.unit }}</span></div>
                    <div class="ms-kpi-progress">
                      <div class="ms-kpi-bar" [style.width.%]="0"></div>
                    </div>
                    <div class="ms-kpi-current">Current: {{ kpi.current }}</div>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="ms-card ms-placeholder">
              <i class="bi bi-diagram-3"></i>
              <h3>No plan generated yet</h3>
              <p>Fill in the campaign brief and click "Generate Campaign Plan" to see a professional timeline with phases, activities, and KPIs.</p>
            </div>
          }

          @if (history().length > 0) {
            <div class="ms-card ms-history">
              <div class="ms-card-head">
                <h2 class="ms-card-title"><i class="bi bi-clock-history"></i> Past Plans</h2>
              </div>
              <div class="ms-history-list">
                @for (plan of history(); track plan.id) {
                  <button class="ms-history-item" (click)="loadPlan(plan)">
                    <div class="ms-hinfo">
                      <strong>{{ plan.name }}</strong>
                      <span>{{ campaignTypeLabel(plan.type) }} · {{ durationLabel(plan.duration) }} · ₹{{ plan.budget | number }}</span>
                    </div>
                    <div class="ms-hmeta">
                      <span>{{ plan.startDate }} – {{ plan.endDate }}</span>
                      <i class="bi bi-chevron-right"></i>
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './marketing-strategist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingStrategistComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(MarketingStrategistService);

  readonly durations = CAMPAIGN_DURATIONS;
  readonly campaignTypes = CAMPAIGN_TYPES;
  readonly productCategories = PRODUCT_CATEGORIES;
  readonly targetAudiences = TARGET_AUDIENCES;
  readonly history = computed(() => this.service.plans());

  input: StrategistInput = this.service.getDefaultInput();
  loading = signal(false);
  selectedPlan = signal<CampaignPlan | null>(null);

  totalActivities = computed(() => this.selectedPlan()?.phases.reduce((sum, p) => sum + p.activities.length, 0) ?? 0);
  uniqueChannels = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return 0;
    const channels = new Set<string>();
    plan.phases.forEach(p => p.activities.forEach(a => channels.add(a.channel)));
    return channels.size;
  });

  durationLabel(value: string): string {
    return this.durations.find(d => d.value === value as any)?.label ?? value;
  }

  campaignTypeLabel(value: string): string {
    return this.campaignTypes.find(t => t.value === value as any)?.label ?? value;
  }

  phaseColor(phase: CampaignPhase): string {
    const colors = ['#0f6f84', '#c9a54c', '#b91c1c', '#7c3aed', '#059669'];
    const idx = this.selectedPlan()?.phases.indexOf(phase) ?? 0;
    return colors[idx % colors.length];
  }

  onGenerate(): void {
    if (this.loading() || !this.input.campaignName.trim()) return;
    this.loading.set(true);
    setTimeout(() => {
      const plan = this.service.generatePlan({ ...this.input });
      this.selectedPlan.set(plan);
      this.loading.set(false);
      this.toast.success(`Campaign plan generated — ${plan.phases.length} phases, ${this.totalActivities()} activities`);
    }, 800);
  }

  loadPlan(plan: CampaignPlan): void {
    this.selectedPlan.set(plan);
    this.toast.info('Loaded previous plan');
  }

  resetForm(): void {
    this.input = this.service.getDefaultInput();
    this.selectedPlan.set(null);
  }

  clearHistory(): void {
    if (confirm('Clear all campaign plans?')) {
      this.service.clearHistory();
      this.selectedPlan.set(null);
      this.toast.info('History cleared');
    }
  }
}