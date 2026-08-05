import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { AiDecisionEngineService } from './ai-decision-engine.service';
import {
  DECISION_AUDIENCES,
  DECISION_CATEGORIES,
  DECISION_GOALS,
  DecisionResult,
} from './models/ai-decision-engine.model';

interface SignalItem {
  label: string;
  weight: number;
  tone: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-ai-decision-engine',
  standalone: true,
  imports: [],
  template: `
    <div class="de-page">
      <div class="de-header">
        <div>
          <h1 class="de-title"><i class="bi bi-cpu"></i> AI Decision Engine</h1>
          <p class="de-desc">The engine evaluates signals across every dimension and recommends the best platform, timing, audience and creative choices for your brief.</p>
        </div>
        <div class="de-actions">
          <button class="btn btn-outline-secondary de-btn" (click)="clearHistory()" [disabled]="history().length === 0">
            <i class="bi bi-trash3"></i> Clear History
          </button>
        </div>
      </div>

      <div class="de-brief">
        <div class="de-field">
          <label class="de-label"><i class="bi bi-bullseye"></i> Campaign Goal</label>
          <select class="form-select de-input-ui" [value]="goal()" (change)="goal.set($any($event.target).value)">
            @for (g of goals(); track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>
        <div class="de-field">
          <label class="de-label"><i class="bi bi-tags"></i> Category</label>
          <select class="form-select de-input-ui" [value]="category()" (change)="category.set($any($event.target).value)">
            @for (c of categories(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
        <div class="de-field">
          <label class="de-label"><i class="bi bi-people"></i> Target Audience</label>
          <select class="form-select de-input-ui" [value]="audience()" (change)="audience.set($any($event.target).value)">
            @for (a of audiences(); track a) {
              <option [value]="a">{{ a }}</option>
            }
          </select>
        </div>
        <div class="de-field de-field-cta">
          <span class="de-label">&nbsp;</span>
          <button class="btn de-btn-primary de-run" (click)="run()" [disabled]="loading()">
            @if (loading()) {
              <span class="de-spinner"></span> Analyzing...
            } @else {
              <i class="bi bi-diagram-3"></i> Run Decision Analysis
            }
          </button>
        </div>
      </div>

      @if (result()) {
        <div class="de-overview">
          <div class="de-ov-score">
            <div class="de-ov-ring" [style.background]="overallGradient()">
              <div class="de-ov-hole">
                <span class="de-ov-value">{{ overallConfidence() }}%</span>
                <span class="de-ov-label">Confidence</span>
              </div>
            </div>
          </div>
          <div class="de-ov-picks">
            <div class="de-pick">
              <span class="de-pick-label"><i class="bi bi-grid-1x2"></i> Best Platform</span>
              <strong class="de-pick-value">{{ decision('platform')?.decision }}</strong>
            </div>
            <div class="de-pick">
              <span class="de-pick-label"><i class="bi bi-clock"></i> Best Time</span>
              <strong class="de-pick-value">{{ decision('time')?.decision }}</strong>
            </div>
            <div class="de-pick">
              <span class="de-pick-label"><i class="bi bi-megaphone"></i> Best Campaign</span>
              <strong class="de-pick-value">{{ decision('campaignType')?.decision }}</strong>
            </div>
            <div class="de-pick">
              <span class="de-pick-label"><i class="bi bi-palette2"></i> Best Color Theme</span>
              <strong class="de-pick-value">{{ decision('colorTheme')?.decision }}</strong>
            </div>
          </div>
        </div>

        <div class="de-card">
          <div class="de-card-head">
            <h3 class="de-card-title"><i class="bi bi-activity"></i> Active Signals</h3>
            <span class="de-card-hint">Weighted inputs feeding the decisions</span>
          </div>
          <div class="de-signals">
            @for (s of signals(); track s.label) {
              <div class="de-signal">
                <span class="de-signal-name">{{ s.label }}</span>
                <span class="de-signal-bar">
                  <span class="de-signal-fill" [class]="'de-sig-' + s.tone" [style.width.%]="s.weight"></span>
                </span>
                <span class="de-signal-w">{{ s.weight }}%</span>
              </div>
            }
          </div>
        </div>

        <div class="de-grid">
          @for (d of result()!; track d.key) {
            <div class="de-card de-decision">
              <div class="de-d-head">
                <span class="de-d-ic"><i class="bi {{ d.icon }}"></i></span>
                <span class="de-d-label">{{ d.label }}</span>
                <span class="de-d-conf">{{ d.confidence }}%</span>
              </div>
              <div class="de-d-winner">
                <strong>{{ d.decision }}</strong>
                <span class="de-d-winner-tag">Recommended</span>
              </div>
              <div class="de-d-cands">
                @for (c of d.candidates; track c.name) {
                  <div class="de-cand" [class.de-cand-win]="c.isWinner">
                    <span class="de-cand-name">{{ c.name }}</span>
                    <span class="de-cand-track"><span class="de-cand-fill" [style.width.%]="c.score"></span></span>
                    <span class="de-cand-score">{{ c.score }}</span>
                  </div>
                }
              </div>
              <p class="de-d-reason"><i class="bi bi-lightbulb"></i> {{ d.reasoning }}</p>
            </div>
          }
        </div>
      } @else {
        <div class="de-placeholder">
          <i class="bi bi-cpu"></i>
          <h3>Awaiting analysis</h3>
          <p>Set your campaign goal, category and audience, then run the decision engine to get 9 recommendations — platform, time, audience, creative, CTA, campaign type, frequency, color theme and image style.</p>
        </div>
      }

      @if (history().length > 0) {
        <div class="de-history">
          <div class="de-history-head">
            <h3 class="de-history-title"><i class="bi bi-clock-history"></i> Past Analyses</h3>
          </div>
          <div class="de-history-list">
            @for (h of history(); track $index) {
              <button class="de-hchip" (click)="openHistory(h)">
                <i class="bi bi-diagram-3"></i>
                <span class="de-hinfo">
                  <span class="de-hname">{{ h.find(d => d.key === 'platform')?.decision }}</span>
                  <span class="de-hdate">{{ dateLabel($index) }}</span>
                </span>
                <i class="bi bi-chevron-right"></i>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './ai-decision-engine.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiDecisionEngineComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(AiDecisionEngineService);

  readonly goals = computed(() => DECISION_GOALS);
  readonly categories = computed(() => DECISION_CATEGORIES);
  readonly audiences = computed(() => DECISION_AUDIENCES);
  readonly history = computed(() => this.service.history());

  readonly goal = signal('Sales');
  readonly category = signal('Ethnic Wear');
  readonly audience = signal('Urban Women 25-34');
  readonly loading = signal(false);
  readonly result = signal<DecisionResult[] | null>(null);

  readonly signals = signal<SignalItem[]>([
    { label: 'Historical engagement trend', weight: 32, tone: 'high' },
    { label: 'Audience online patterns', weight: 26, tone: 'high' },
    { label: 'Top-performing creatives', weight: 20, tone: 'medium' },
    { label: 'Competitor benchmark', weight: 14, tone: 'medium' },
    { label: 'Seasonal signals', weight: 8, tone: 'low' },
  ]);

  readonly overallConfidence = computed(() => {
    const r = this.result();
    if (!r?.length) return 0;
    return Math.round(r.reduce((s, d) => s + d.confidence, 0) / r.length);
  });

  readonly overallGradient = computed(() => {
    const c = this.overallConfidence();
    return `conic-gradient(#0f6f84 ${c * 3.6}deg, #e6f4f7 ${c * 3.6}deg)`;
  });

  decision(key: DecisionResult['key']): DecisionResult | undefined {
    return this.result()?.find(d => d.key === key);
  }

  dateLabel(index: number): string {
    return `Analysis ${this.history().length - index}`;
  }

  run(): void {
    if (this.loading()) return;
    this.loading.set(true);
    window.setTimeout(() => {
      this.result.set(this.service.decide({ goal: this.goal(), category: this.category(), audience: this.audience() }));
      this.loading.set(false);
      this.toast.success('Decision analysis complete — 9 recommendations');
    }, 850);
  }

  openHistory(h: DecisionResult[]): void {
    this.result.set(h);
    this.toast.info('Loaded previous analysis');
  }

  clearHistory(): void {
    if (confirm('Clear decision history?')) {
      this.service.clearHistory();
      this.toast.info('Decision history cleared');
    }
  }
}