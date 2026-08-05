import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { AiReviewerService } from './ai-reviewer.service';
import {
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_ICONS,
  REVIEW_SAMPLE_CONTENT,
  ReviewCategory,
  ReviewResult,
  severityTone,
} from './models/ai-reviewer.model';

@Component({
  selector: 'app-ai-reviewer',
  standalone: true,
  imports: [],
  template: `
    <div class="rv-page">
      <div class="rv-header">
        <div>
          <h1 class="rv-title"><i class="bi bi-clipboard2-check"></i> AI Reviewer</h1>
          <p class="rv-desc">Professional content review — score captions, prompts, hooks and more, with problems, suggestions and improvements.</p>
        </div>
        <div class="rv-actions">
          <button class="btn btn-outline-secondary rv-btn" (click)="clearHistory()" [disabled]="history().length === 0">
            <i class="bi bi-trash3"></i> Clear History
          </button>
          <button class="btn rv-btn-primary" (click)="runReview()" [disabled]="running()">
            @if (running()) {
              <span class="rv-spinner"></span> Reviewing...
            } @else {
              <i class="bi bi-stars"></i> Run Review
            }
          </button>
        </div>
      </div>

      <div class="rv-stats">
        <div class="rv-stat">
          <span class="rv-stat-value">{{ latestScore() }}</span>
          <span class="rv-stat-label">Latest Score</span>
        </div>
        <div class="rv-stat">
          <span class="rv-stat-value">{{ avgScore() }}</span>
          <span class="rv-stat-label">Avg Score</span>
        </div>
        <div class="rv-stat">
          <span class="rv-stat-value">{{ history().length }}</span>
          <span class="rv-stat-label">Reviews Run</span>
        </div>
        <div class="rv-stat">
          <span class="rv-stat-value">{{ bestCategory() }}</span>
          <span class="rv-stat-label">Best Category</span>
        </div>
      </div>

      <div class="rv-layout">
        <div class="rv-main">
          <div class="rv-card">
            <div class="rv-card-head">
              <h3 class="rv-card-title"><i class="bi bi-grid-1x2"></i> Select Review Type</h3>
              <span class="rv-card-hint">Choose a category to load sample content</span>
            </div>
            <div class="rv-chips">
              @for (c of categories(); track c) {
                <button class="rv-chip" [class.rv-chip-on]="c === category()" (click)="pickCategory(c)">
                  <i class="bi {{ icon(c) }}"></i> {{ c }}
                </button>
              }
            </div>
          </div>

          <div class="rv-card">
            <div class="rv-card-head">
              <h3 class="rv-card-title"><i class="bi bi-pencil-square"></i> Content to Review — {{ category() }}</h3>
              <button class="rv-btn-link" (click)="loadSample()"><i class="bi bi-arrow-clockwise"></i> Reload Sample</button>
            </div>
            <textarea class="form-control rv-textarea" [value]="content()" rows="6"
              (input)="content.set($any($event.target).value)"></textarea>
            <div class="rv-foot">
              <span class="rv-chars">{{ content().length }} chars · {{ wordCount() }} words</span>
              <button class="btn rv-btn-primary" (click)="runReview()" [disabled]="running()">
                @if (running()) { <span class="rv-spinner"></span> Reviewing... } @else { <i class="bi bi-stars"></i> Run Review }
              </button>
            </div>
          </div>

          @if (result()) {
            <div class="rv-result">
              <div class="rv-score-card">
                <div class="rv-ring" [style.background]="ringBackground()">
                  <div class="rv-ring-inner">
                    <span class="rv-score-value">{{ result()!.score }}</span>
                    <span class="rv-score-max">/ 100</span>
                  </div>
                </div>
                <div class="rv-score-info">
                  <span class="rv-cat-name"><i class="bi {{ icon(result()!.category) }}"></i> {{ result()!.category }}</span>
                  <span class="rv-verdict" [class]="'rv-verdict-' + scoreTone(result()!.score)">{{ result()!.verdict }}</span>
                  <span class="rv-date">{{ dateLabel(result()!.createdAt) }}</span>
                </div>
                <div class="rv-pill rv-pill-good"><i class="bi bi-check-circle-fill"></i> 0 Critical</div>
                <div class="rv-pill" [class.rv-pill-warn]="highCount() > 0">{{ highCount() }} High</div>
                <div class="rv-pill" [class.rv-pill-mid]="mediumCount() > 0">{{ mediumCount() }} Medium</div>
                <div class="rv-pill">{{ lowCount() }} Low</div>
              </div>

              <div class="rv-cols">
                <div class="rv-col">
                  <h4 class="rv-col-title"><i class="bi bi-exclamation-triangle"></i> Problems <span class="rv-count">{{ result()!.problems.length }}</span></h4>
                  @for (p of result()!.problems; track p.problem) {
                    <div class="rv-issue">
                      <span class="rv-dot" [style.background]="severityColor(p.severity)"></span>
                      <span class="rv-issue-text">{{ p.problem }}</span>
                    </div>
                  }
                  @if (result()!.problems.length === 0) {
                    <p class="rv-none">No problems found. Great work!</p>
                  }
                </div>

                <div class="rv-col">
                  <h4 class="rv-col-title"><i class="bi bi-lightbulb"></i> Suggestions <span class="rv-count">{{ result()!.suggestions.length }}</span></h4>
                  @for (s of result()!.suggestions; track s) {
                    <div class="rv-item"><i class="bi bi-arrow-right-short rv-bullet"></i><span>{{ s }}</span></div>
                  }
                </div>

                <div class="rv-col">
                  <h4 class="rv-col-title"><i class="bi bi-trending-up"></i> Improvements <span class="rv-count">{{ result()!.improvements.length }}</span></h4>
                  @for (im of result()!.improvements; track im) {
                    <div class="rv-item"><i class="bi bi-check2-circle rv-bullet rv-bullet-ok"></i><span>{{ im }}</span></div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="rv-placeholder">
              <i class="bi bi-clipboard2-check"></i>
              <p>Select a category and run a review to see score, problems, suggestions and improvements.</p>
            </div>
          }
        </div>

        <div class="rv-side">
          <div class="rv-card">
            <div class="rv-card-head">
              <h3 class="rv-card-title"><i class="bi bi-clock-history"></i> Review History</h3>
            </div>
            @if (history().length > 0) {
              <div class="rv-history">
                @for (h of history(); track h.id) {
                  <button class="rv-hrow" (click)="openHistory(h)">
                    <span class="rv-hscore" [class]="'rv-hscore-' + scoreTone(h.score)">{{ h.score }}</span>
                    <span class="rv-hinfo">
                      <span class="rv-hname">{{ h.category }}</span>
                      <span class="rv-hdate">{{ dateLabel(h.createdAt) }}</span>
                    </span>
                    <i class="bi bi-chevron-right rv-hchev"></i>
                  </button>
                }
              </div>
            } @else {
              <p class="rv-none">No reviews yet. Run your first review to see history here.</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-reviewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewerComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(AiReviewerService);

  readonly categories = computed(() => REVIEW_CATEGORIES);
  readonly history = computed(() => this.service.history());

  readonly category = signal<ReviewCategory>('Caption');
  readonly content = signal<string>(REVIEW_SAMPLE_CONTENT['Caption']);
  readonly running = signal(false);
  readonly result = signal<ReviewResult | null>(null);

  readonly wordCount = computed(() => {
    const w = this.content().trim().split(/\s+/).filter(Boolean);
    return w.length;
  });

  readonly latestScore = computed(() => this.result()?.score ?? '—');
  readonly avgScore = computed(() => {
    const h = this.history();
    if (!h.length) return '—';
    return Math.round(h.reduce((s, r) => s + r.score, 0) / h.length);
  });
  readonly bestCategory = computed(() => {
    const h = this.history();
    if (!h.length) return '—';
    const best = h.reduce((a, b) => (b.score > a.score ? b : a));
    return best.category;
  });

  readonly highCount = computed(() => this.countOf('high'));
  readonly mediumCount = computed(() => this.countOf('medium'));
  readonly lowCount = computed(() => this.countOf('low'));

  readonly ringBackground = computed(() => {
    const score = this.result()?.score ?? 0;
    const color = score >= 75 ? '#22a34a' : score >= 50 ? '#d97706' : '#dc2626';
    return `conic-gradient(${color} ${score * 3.6}deg, #eef1f4 ${score * 3.6}deg)`;
  });

  icon(c: ReviewCategory): string {
    return REVIEW_CATEGORY_ICONS[c];
  }

  scoreTone(score: number): string {
    if (score >= 75) return 'good';
    if (score >= 50) return 'warn';
    return 'bad';
  }

  severityColor(sev: string): string {
    return severityTone(sev as 'high' | 'medium' | 'low');
  }

  dateLabel(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private countOf(sev: 'high' | 'medium' | 'low'): number {
    return this.result()?.problems.filter(p => p.severity === sev).length ?? 0;
  }

  pickCategory(c: ReviewCategory): void {
    this.category.set(c);
    this.content.set(REVIEW_SAMPLE_CONTENT[c]);
  }

  loadSample(): void {
    this.content.set(REVIEW_SAMPLE_CONTENT[this.category()]);
    this.toast.info(`Sample ${this.category().toLowerCase()} content loaded`);
  }

  runReview(): void {
    if (!this.content().trim()) {
      this.toast.info('Paste or write content before running a review');
      return;
    }
    this.running.set(true);
    window.setTimeout(() => {
      this.result.set(this.service.review(this.category(), this.content()));
      this.running.set(false);
      this.toast.success('Review complete');
    }, 650);
  }

  openHistory(h: ReviewResult): void {
    this.result.set(h);
    this.category.set(h.category);
    this.content.set(h.content);
    this.toast.info('Loaded review from history');
  }

  clearHistory(): void {
    if (confirm('Clear the review history?')) {
      this.service.clearHistory();
      this.toast.info('Review history cleared');
    }
  }
}