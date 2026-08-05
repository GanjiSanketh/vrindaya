import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';

type StageStatus = 'pending' | 'running' | 'done';

interface GenStage {
  id: number;
  name: string;
  icon: string;
  color: string;
  status: StageStatus;
  progress: number;
  duration: number;
  detail: string;
}

interface LogEntry {
  time: string;
  text: string;
}

const PLATFORMS = ['Instagram', 'Facebook', 'Pinterest', 'WhatsApp', 'Website Blog', 'Flipkart', 'Landing Page', 'Email'];
const TONES = ['Heritage Premium', 'Playful & Bright', 'Minimal & Clean', 'Festive & Grand', 'Editorial & Bold'];

function stamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}

@Component({
  selector: 'app-multi-step-generation',
  standalone: true,
  imports: [],
  template: `
    <div class="ms-page">
      <div class="ms-header">
        <div>
          <h1 class="ms-title"><i class="bi bi-stack"></i> Multi-Step AI Generation</h1>
          <p class="ms-desc">A guided pipeline of 8 generation stages — research to final output — each with live progress.</p>
        </div>
        <div class="ms-actions">
          <button class="btn btn-outline-secondary ms-btn" (click)="reset()" [disabled]="running()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn ms-btn-primary" (click)="start()" [disabled]="running()">
            @if (running()) {
              <span class="ms-spinner"></span> Generating...
            } @else if (allDone()) {
              <i class="bi bi-arrow-repeat"></i> Regenerate
            } @else {
              <i class="bi bi-play-fill"></i> Start Generation
            }
          </button>
        </div>
      </div>

      <div class="ms-layout">
        <div class="ms-main">
          <div class="ms-card ms-brief">
            <div class="ms-card-head">
              <h3 class="ms-card-title"><i class="bi bi-pencil-square"></i> Campaign Brief</h3>
              <span class="ms-card-hint">Personalises every stage output</span>
            </div>
            <div class="ms-brief-row">
              <div class="ms-brief-field">
                <label class="ms-label">Product / Collection</label>
                <input class="form-control ms-input" [value]="product()" placeholder="e.g. Zari Luxe Anarkali"
                  (input)="product.set($any($event.target).value)" />
              </div>
              <div class="ms-brief-field">
                <label class="ms-label">Platform</label>
                <select class="form-select ms-input" [value]="platform()" (change)="platform.set($any($event.target).value)">
                  @for (p of platforms(); track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
              <div class="ms-brief-field">
                <label class="ms-label">Tone</label>
                <select class="form-select ms-input" [value]="tone()" (change)="tone.set($any($event.target).value)">
                  @for (t of tones(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          <div class="ms-card ms-progress-card">
            <div class="ms-progress-head">
              <span class="ms-progress-label">Overall Progress</span>
              <span class="ms-progress-pct">{{ overallPercent() }}%</span>
            </div>
            <div class="ms-progress">
              <div class="ms-progress-bar" [style.width]="overallPercent() + '%'"></div>
            </div>
            <div class="ms-progress-meta">
              <span>{{ doneCount() }}/{{ stages().length }} stages complete</span>
              <span>{{ elapsedLabel() }}</span>
            </div>
          </div>

          <div class="ms-flow">
            @for (s of stages(); track s.id) {
              <div class="ms-stage-wrap">
                <div class="ms-stage" [class]="'ms-st-' + s.status">
                  <div class="ms-stage-head">
                    <span class="ms-stage-icon" [style.background]="s.color"><i class="bi {{ s.icon }}"></i></span>
                    <div class="ms-stage-title">
                      <div class="ms-stage-name-row">
                        <span class="ms-stage-step">{{ pad(s.id) }}</span>
                        <strong class="ms-stage-name">{{ s.name }}</strong>
                        <span class="ms-stage-status" [class]="'ms-st-label-' + s.status">
                          @if (s.status === 'running') {
                            <span class="ms-spinner ms-spinner-sm"></span> Running
                          } @else if (s.status === 'done') {
                            <i class="bi bi-check2-circle"></i> Complete
                          } @else {
                            <i class="bi bi-circle"></i> Queued
                          }
                        </span>
                      </div>
                      <div class="ms-stage-track">
                        <div class="ms-stage-bar" [style.width]="s.progress + '%'"></div>
                      </div>
                    </div>
                    <span class="ms-stage-pct">{{ s.progress }}%</span>
                  </div>

                  @if (s.detail) {
                    <div class="ms-stage-detail">
                      <i class="bi bi-file-earmark-text"></i>
                      <span>{{ s.detail }}</span>
                    </div>
                  }
                </div>

                @if (!isLast(s.id)) {
                  <div class="ms-arrow"><i class="bi bi-chevron-down"></i></div>
                }
              </div>
            }
          </div>
        </div>

        <div class="ms-side">
          <div class="ms-card">
            <div class="ms-card-head">
              <h3 class="ms-card-title"><i class="bi bi-terminal"></i> Generation Console</h3>
              <button class="ms-btn-link" (click)="clearLog()"><i class="bi bi-x-lg"></i> Clear</button>
            </div>
            <div class="ms-console">
              @for (e of log(); track $index) {
                <div class="ms-log-row">
                  <span class="ms-log-time">{{ e.time }}</span>
                  <span class="ms-log-text">{{ e.text }}</span>
                </div>
              }
              @if (log().length === 0) {
                <p class="ms-log-empty">Console ready. Start a generation to see stage activity.</p>
              }
            </div>
          </div>

          <div class="ms-card">
            <h3 class="ms-card-title"><i class="bi bi-activity"></i> Pipeline Summary</h3>
            <div class="ms-tiles">
              <div class="ms-tile">
                <span class="ms-tile-value">{{ doneCount() }}/{{ stages().length }}</span>
                <span class="ms-tile-label">Stages</span>
              </div>
              <div class="ms-tile">
                <span class="ms-tile-value">{{ overallPercent() }}%</span>
                <span class="ms-tile-label">Progress</span>
              </div>
              <div class="ms-tile">
                <span class="ms-tile-value">{{ avgReviewScore() }}</span>
                <span class="ms-tile-label">Review Score</span>
              </div>
            </div>
            @if (allDone()) {
              <div class="ms-ready">
                <i class="bi bi-check2-circle"></i>
                <div>
                  <strong>Final output ready</strong>
                  <span>Review stage scored {{ avgReviewScore() }}/100 · optimized before publish</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './multi-step-generation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiStepGenerationComponent {
  private readonly toast = inject(ToastService);

  readonly product = signal('Zari Luxe Anarkali');
  readonly platform = signal('Instagram');
  readonly tone = signal('Heritage Premium');

  readonly platforms = computed(() => PLATFORMS);
  readonly tones = computed(() => TONES);

  readonly stages = signal<GenStage[]>(this.buildStages());
  readonly log = signal<LogEntry[]>([]);
  readonly running = signal(false);
  readonly startedAt = signal<number | null>(null);

  private timers: number[] = [];

  readonly overallPercent = computed(() => {
    if (this.stages().length === 0) return 0;
    return Math.round(this.stages().reduce((sum, s) => sum + s.progress, 0) / this.stages().length);
  });

  readonly doneCount = computed(() => this.stages().filter(s => s.status === 'done').length);
  readonly allDone = computed(() => this.stages().length > 0 && this.doneCount() === this.stages().length);

  readonly elapsedLabel = computed(() => {
    const start = this.startedAt();
    if (!start) return 'Not started';
    const secs = Math.round((Date.now() - start) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `Elapsed ${m}:${String(s).padStart(2, '0')}`;
  });

  readonly avgReviewScore = computed(() => {
    const review = this.stages().find(s => s.id === 6);
    if (!review || review.status !== 'done' || !review.detail) return '—';
    const m = review.detail.match(/(\d+)\/100/);
    return m ? m[1] : '—';
  });

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  isLast(id: number): boolean {
    return id === this.stages().length;
  }

  start(): void {
    if (this.running()) return;
    this.resetStages();
    this.running.set(true);
    this.startedAt.set(Date.now());
    this.pushLog(`Generation started for ${this.product() || 'product'} on ${this.platform()} (${this.tone()} tone)`);
    this.runStage(0);
  }

  private runStage(idx: number): void {
    if (idx >= this.stages().length) {
      this.running.set(false);
      this.pushLog('Generation finished — final output ready');
      this.toast.success('Multi-step generation complete');
      return;
    }

    const stages = this.stages();
    const stage = { ...stages[idx] };
    stages[idx] = { ...stage, status: 'running' };
    this.stages.set([...stages]);

    this.pushLog(`Stage ${stage.id}/8 — ${stage.name} started`);
    const step = 100 / (stage.duration / 90);
    const timer = window.setInterval(() => {
      const cur = this.stages()[idx];
      const next = Math.min(100, cur.progress + step);
      const updated = [...this.stages()];
      updated[idx] = { ...cur, progress: Math.round(next) };
      this.stages.set(updated);

      if (next >= 100) {
        window.clearInterval(timer);
        const done = updated[idx];
        updated[idx] = { ...done, status: 'done', progress: 100, detail: this.buildDetail(done) };
        this.stages.set([...updated]);
        this.pushLog(`Stage ${done.id}/8 — ${done.name} complete`);
        this.runStage(idx + 1);
      }
    }, 90);
    this.timers.push(timer);
  }

  private buildStages(): GenStage[] {
    const defs: Array<Pick<GenStage, 'name' | 'icon' | 'color' | 'duration'>> = [
      { name: 'Research', icon: 'bi-search', color: '#0ea5e9', duration: 900 },
      { name: 'Strategy', icon: 'bi-compass', color: '#8b5cf6', duration: 800 },
      { name: 'Prompt Building', icon: 'bi-code-slash', color: '#6366f1', duration: 900 },
      { name: 'Content Generation', icon: 'bi-file-text', color: '#0f6f84', duration: 1100 },
      { name: 'Image Prompt', icon: 'bi-image', color: '#22c55e', duration: 800 },
      { name: 'Review', icon: 'bi-clipboard2-check', color: '#c9a54c', duration: 700 },
      { name: 'Optimization', icon: 'bi-sliders2', color: '#f59e0b', duration: 800 },
      { name: 'Final Output', icon: 'bi-check2-all', color: '#14b8a6', duration: 900 },
    ];
    return defs.map((d, i) => ({
      id: i + 1,
      status: 'pending' as StageStatus,
      progress: 0,
      detail: '',
      ...d,
    }));
  }

  private resetStages(): void {
    this.timers.forEach(t => window.clearInterval(t));
    this.timers = [];
    this.stages.set(this.buildStages());
  }

  reset(): void {
    if (this.running()) return;
    this.resetStages();
    this.log.set([]);
    this.startedAt.set(null);
    this.toast.info('Generation reset');
  }

  clearLog(): void {
    this.log.set([]);
  }

  private pushLog(text: string): void {
    const entry: LogEntry = { time: stamp(), text };
    this.log.update(list => [...list, entry].slice(-60));
  }

  private buildDetail(s: GenStage): string {
    const product = this.product().trim() || 'the collection';
    const platform = this.platform();
    const tone = this.tone();

    const map: Record<number, string> = {
      1: `Research complete for “${product}” — niche scan shows ${26 + s.id * 3} competitor posts/week; audience peaks 8–10 PM IST; top signals: ${tone} tone, festival drops, styling-led imagery.`,
      2: `Strategy locked — angle: ${tone} storytelling; pillars: craftsmanship, occasion styling, festival drops; cadence 5 posts/week on ${platform}.`,
      3: `Prompt built from brand voice + ${platform} template — structured, ${140 + s.id * 17} tokens, ${tone} tone, explicit CTA and hashtag slot.`,
      4: `Content generated — 3 caption variants drafted; primary picks ${product} + occasion fit + a single clear call-to-action.`,
      5: `Image prompt drafted — editorial model, ${product.toLowerCase()}, soft daylight, minimal beige backdrop, 4:5 portrait, earth tones, negative prompt included.`,
      6: `Review passed — score ${82 + s.id}/100, 1 minor problem, 3 suggestions applied; brand consistency verified.`,
      7: `Optimization applied — sharper headline, +3 seasonal hashtags, tighter CTA, estimated +6 score uplift for ${platform}.`,
      8: `Final output ready — publish-ready caption, image prompt and hashtag set for ${platform} under the ${tone} tone.`,
    };

    return map[s.id];
  }
}