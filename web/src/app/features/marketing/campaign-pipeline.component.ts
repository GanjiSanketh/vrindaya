import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';

type StageStatus = 'pending' | 'running' | 'success' | 'error';

interface PipelineStage {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: StageStatus;
  duration: number;
  error: string | null;
}

const STAGES: Omit<PipelineStage, 'status' | 'error'>[] = [
  { id: 'product', name: 'Product', icon: 'bi-bag', color: '#0f6f84', duration: 400 },
  { id: 'knowledge', name: 'Knowledge', icon: 'bi-book', color: '#c9a54c', duration: 500 },
  { id: 'brand-voice', name: 'Brand Voice', icon: 'bi-mic', color: '#ec4899', duration: 400 },
  { id: 'prompt-builder', name: 'Prompt Builder', icon: 'bi-mindmap', color: '#8b5cf6', duration: 600 },
  { id: 'ai-agents', name: 'AI Agents', icon: 'bi-robot', color: '#6366f1', duration: 700 },
  { id: 'llm', name: 'LLM', icon: 'bi-cpu', color: '#0ea5e9', duration: 1200 },
  { id: 'image-prompt', name: 'Image Prompt', icon: 'bi-camera', color: '#14b8a6', duration: 500 },
  { id: 'generated-images', name: 'Generated Images', icon: 'bi-images', color: '#22c55e', duration: 1500 },
  { id: 'review', name: 'Review', icon: 'bi-clipboard-check', color: '#f59e0b', duration: 800 },
  { id: 'approval', name: 'Approval', icon: 'bi-patch-check', color: '#c9a54c', duration: 400 },
  { id: 'schedule', name: 'Schedule', icon: 'bi-calendar3', color: '#0f6f84', duration: 500 },
  { id: 'publish', name: 'Publish', icon: 'bi-send', color: '#22c55e', duration: 600 },
  { id: 'analytics', name: 'Analytics', icon: 'bi-bar-chart', color: '#8b5cf6', duration: 700 },
];

const fmtDuration = (ms: number): string => (ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms');

@Component({
  selector: 'app-campaign-pipeline',
  standalone: true,
  imports: [],
  template: `
    <div class="cp-page">
      <div class="cp-header">
        <div>
          <h1 class="cp-title"><i class="bi bi-diagram-3"></i> Campaign Pipeline</h1>
          <p class="cp-desc">Visual workflow from product to analytics — every stage with status, duration, errors and retry.</p>
        </div>
        <div class="cp-actions">
          <label class="cp-toggle-label">
            <input type="checkbox" [checked]="simulateError()" (change)="simulateError.set($any($event.target).checked)" />
            <span class="cp-toggle-track"></span>
            <span>Simulate error</span>
          </label>
          <button class="btn btn-outline-secondary cp-btn" (click)="reset()" [disabled]="running()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn cp-btn-primary" (click)="run()" [disabled]="running()">
            @if (running()) {
              <span class="cp-spinner"></span> Running...
            } @else {
              <i class="bi bi-play-fill"></i> Run Pipeline
            }
          </button>
        </div>
      </div>

      <div class="cp-summary">
        <div class="cp-summary-main">
          <div class="cp-summary-meta">
            <span class="cp-summary-title">Pipeline Progress</span>
            <span class="cp-summary-pct">{{ progress() }}%</span>
          </div>
          <div class="progress cp-progress">
            <div class="progress-bar" [style.width.%]="progress()"></div>
          </div>
        </div>
        <div class="cp-stats">
          <div class="cp-stat"><i class="bi bi-check-circle-fill"></i><span>{{ successCount() }}</span> Completed</div>
          <div class="cp-stat"><i class="bi bi-x-circle-fill"></i><span>{{ errorCount() }}</span> Failed</div>
          <div class="cp-stat"><i class="bi bi-stopwatch"></i><span>{{ totalDuration() }}</span> Est. Total</div>
          <div class="cp-stat"><i class="bi bi-gear-fill"></i><span>{{ running() ? 'Active' : 'Idle' }}</span> State</div>
        </div>
      </div>

      <div class="cp-flow">
        @for (s of stages(); track s.id; let i = $index) {
          <div class="cp-stage-wrap">
            <div [class]="'cp-stage cp-st-' + s.status">
              <div class="cp-stage-head">
                <span class="cp-stage-icon" [style.background]="s.color"><i class="bi {{ s.icon }}"></i></span>
                <div class="cp-stage-title">
                  <div class="cp-stage-name-row">
                    <strong>{{ s.name }}</strong>
                    <span class="cp-stage-step">Step {{ i + 1 }}</span>
                  </div>
                  <span class="cp-stage-status" [class.cp-st-pending]="s.status === 'pending'"
                        [class.cp-st-running]="s.status === 'running'"
                        [class.cp-st-success]="s.status === 'success'"
                        [class.cp-st-error]="s.status === 'error'">
                    @if (s.status === 'running') { <i class="bi bi-arrow-repeat spin"></i> Running }
                    @else if (s.status === 'success') { <i class="bi bi-check-lg"></i> Complete }
                    @else if (s.status === 'error') { <i class="bi bi-x-lg"></i> Failed }
                    @else { <i class="bi bi-hourglass-split"></i> Pending }
                  </span>
                </div>
                <span class="cp-stage-duration">{{ fmt(s.duration) }}</span>
              </div>

              @if (s.error) {
                <div class="cp-stage-error">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>{{ s.error }}</span>
                  <button class="cp-retry-btn" (click)="retry(s.id)" [disabled]="running()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                  </button>
                </div>
              }
            </div>
            @if (!isLast(i)) {
              <div class="cp-arrow"><i class="bi bi-arrow-down"></i></div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './campaign-pipeline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPipelineComponent {
  private readonly toast = inject(ToastService);

  readonly simulateError = signal(false);
  readonly running = signal(false);

  readonly stages = signal<PipelineStage[]>(STAGES.map(s => ({ ...s, status: 'pending' as StageStatus, error: null })));

  readonly fmt = fmtDuration;

  readonly isLast = (i: number): boolean => i >= this.stages().length - 1;

  readonly successCount = computed(() => this.stages().filter(s => s.status === 'success').length);
  readonly errorCount = computed(() => this.stages().filter(s => s.status === 'error').length);
  readonly progress = computed(() =>
    Math.round(((this.successCount() + this.errorCount()) / this.stages().length) * 100),
  );
  readonly totalDuration = computed(() => fmtDuration(this.stages().reduce((n, s) => n + s.duration, 0)));

  run(): void {
    if (this.running()) return;
    this.stages.update(list => list.map(s => ({ ...s, status: 'pending' as StageStatus, error: null })));
    this.runFrom(0);
  }

  reset(): void {
    if (this.running()) return;
    this.stages.update(list => list.map(s => ({ ...s, status: 'pending' as StageStatus, error: null })));
    this.toast.info('Pipeline reset');
  }

  retry(id: string): void {
    if (this.running()) return;
    const list = this.stages();
    const idx = list.findIndex(s => s.id === id);
    if (idx < 0) return;
    const duration = list[idx].duration;
    this.patch(idx, { status: 'running', error: null });
    this.running.set(true);
    window.setTimeout(() => {
      this.patch(idx, { status: 'success' });
      this.runFrom(idx + 1);
    }, duration);
  }

  private runFrom(startIdx: number): void {
    const list = this.stages();
    this.running.set(true);
    let idx = startIdx;
    const step = () => {
      if (idx >= list.length) {
        this.running.set(false);
        this.toast.success('Campaign pipeline completed');
        return;
      }
      const s = list[idx];
      this.patch(idx, { status: 'running', error: null });
      window.setTimeout(() => {
        if (this.simulateError() && idx === 5) {
          this.patch(idx, { status: 'error', error: `Stage "${s.name}" failed — simulated provider timeout` });
          this.running.set(false);
          this.toast.error('Pipeline stopped — simulate error enabled');
          return;
        }
        this.patch(idx, { status: 'success' });
        idx += 1;
        step();
      }, s.duration);
    };
    step();
  }

  private patch(idx: number, patch: Partial<PipelineStage>): void {
    this.stages.update(list => list.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
}