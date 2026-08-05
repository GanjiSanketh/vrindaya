import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { AiProviderService } from './ai-provider.service';
import {
  AiProvider,
  healthLabel as modelHealthLabel,
  providerTypeLabel,
} from './models/ai-provider.model';

@Component({
  selector: 'app-ai-provider',
  standalone: true,
  imports: [],
  template: `
    <div class="ap-page">
      <div class="ap-header">
        <div>
          <h1 class="ap-title"><i class="bi bi-cpu"></i> AI Provider Manager</h1>
          <p class="ap-desc">Administer multiple AI providers — priority, fallback routing, health, latency and cost — with full enable/disable control.</p>
        </div>
        <div class="ap-actions">
          <button class="btn btn-outline-secondary ap-btn" (click)="addCustom()">
            <i class="bi bi-plus-lg"></i> Add Provider
          </button>
          <button class="btn ap-btn-primary" (click)="runCheck()" [disabled]="checking()">
            @if (checking()) { <span class="ap-spinner"></span> Checking... } @else { <i class="bi bi-heart-pulse"></i> Run Health Check }
          </button>
          <button class="btn btn-outline-secondary ap-btn" (click)="reset()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
        </div>
      </div>

      @if (showAdd()) {
        <div class="ap-addbar">
          <input id="ap-add-name" class="form-control ap-add-input" placeholder="Provider name" [value]="addName()" (input)="addName.set($any($event.target).value)" />
          <input class="form-control ap-add-input" placeholder="Base URL" [value]="addBaseUrl()" (input)="addBaseUrl.set($any($event.target).value)" />
          <input class="form-control ap-add-input" placeholder="Default model" [value]="addModel()" (input)="addModel.set($any($event.target).value)" />
          <button class="btn ap-btn-primary" (click)="saveAdd()" [disabled]="!addName().trim()"><i class="bi bi-check-lg"></i> Save</button>
          <button class="btn btn-outline-secondary ap-btn" (click)="showAdd.set(false)"><i class="bi bi-x-lg"></i></button>
        </div>
      }

      <div class="ap-stats">
        <div class="ap-stat">
          <span class="ap-stat-value">{{ providers().length }}</span>
          <span class="ap-stat-label">Providers</span>
        </div>
        <div class="ap-stat">
          <span class="ap-stat-value">{{ healthyCount() }}</span>
          <span class="ap-stat-label">Healthy</span>
        </div>
        <div class="ap-stat">
          <span class="ap-stat-value">{{ avgResponse() }}ms</span>
          <span class="ap-stat-label">Avg Response</span>
        </div>
        <div class="ap-stat">
          <span class="ap-stat-value">\${{ estCost() }}</span>
          <span class="ap-stat-label">Est. Daily Cost</span>
        </div>
      </div>

      <div class="ap-card">
        <div class="ap-card-head">
          <h3 class="ap-card-title"><i class="bi bi-arrow-repeat"></i> Routing Order</h3>
          <span class="ap-card-hint">Enabled providers called by priority, with fallback</span>
        </div>
        <div class="ap-chain">
          @for (p of chain(); track p.id; let i = $index) {
            <span class="ap-node">
              <span class="ap-node-avatar" [style.background]="p.color"><i class="bi {{ p.icon }}"></i></span>
              <span class="ap-node-name">{{ p.name }}</span>
              <span class="ap-node-prio">P{{ p.priority }}</span>
            </span>
            @if (!isLast(i)) {
              <span class="ap-node-arrow"><i class="bi bi-arrow-right"></i></span>
            }
          }
          @if (chain().length === 0) {
            <span class="ap-none">No providers enabled. Enable at least one to form a routing chain.</span>
          }
        </div>
      </div>

      <div class="ap-list">
        @for (p of providers(); track p.id) {
          <div class="ap-provider" [class.ap-provider-off]="!p.enabled" [style.border-left-color]="borderColor(p.health)">
            <div class="ap-provider-id">
              <span class="ap-avatar" [style.background]="p.color"><i class="bi {{ p.icon }}"></i></span>
              <div class="ap-idinfo">
                <span class="ap-name">{{ p.name }}</span>
                <span class="ap-type-badge" [class]="'ap-type-' + p.type">{{ typeLabel(p.type) }}</span>
              </div>
            </div>

            <div class="ap-cell ap-cell-model">
              <label class="ap-label">Default Model</label>
              <input class="form-control ap-ui" [value]="p.defaultModel" (input)="set(p.id, 'defaultModel', $any($event.target).value)" />
            </div>

            <div class="ap-cell ap-cell-url">
              <label class="ap-label">Base URL</label>
              <input class="form-control ap-ui" [value]="p.baseUrl" (input)="set(p.id, 'baseUrl', $any($event.target).value)" />
            </div>

            <div class="ap-cell ap-cell-key">
              <label class="ap-label">API Key</label>
              <input class="form-control ap-ui" [value]="p.apiKey" type="password" [placeholder]="p.apiKey ? '••••••••' : 'Optional'" (input)="set(p.id, 'apiKey', $any($event.target).value)" />
            </div>

            <div class="ap-cell ap-cell-prio">
              <label class="ap-label">Priority</label>
              <div class="ap-prior">
                <button class="ap-step" (click)="movePriority(p.id, -1)"><i class="bi bi-chevron-up"></i></button>
                <span class="ap-prio-val">P{{ p.priority }}</span>
                <button class="ap-step" (click)="movePriority(p.id, 1)"><i class="bi bi-chevron-down"></i></button>
              </div>
            </div>

            <div class="ap-cell ap-cell-health">
              <label class="ap-label">Health</label>
              <span class="ap-health" [class]="'ap-health-' + p.health">
                <span class="ap-dot"></span>{{ healthLabel(p.health) }}
              </span>
              <span class="ap-latency">
                <span class="ap-latency-val">{{ p.responseTime }}ms</span>
                <span class="ap-latency-bar"><span class="ap-latency-fill" [style.width]="latencyWidth(p.responseTime)"></span></span>
              </span>
              <span class="ap-last">Checked {{ shortSince(p.lastChecked) }}</span>
            </div>

            <div class="ap-cell ap-cell-cost">
              <label class="ap-label">Cost / 1K</label>
              <span class="ap-cost">\${{ p.costPer1k.toFixed(p.costPer1k >= 0.01 ? 3 : 4) }}</span>
            </div>

            <div class="ap-cell ap-cell-switches">
              <label class="ap-switch-label">
                <input type="checkbox" [checked]="p.allowFallback" (change)="set(p.id, 'allowFallback', !p.allowFallback)" />
                <span class="ap-switch-track"></span>
                <span>Fallback</span>
              </label>
              <label class="ap-switch-label">
                <input type="checkbox" [checked]="p.enabled" (change)="toggle(p.id)" />
                <span class="ap-switch-track" [class.ap-switch-on]="p.enabled"></span>
                <span>{{ p.enabled ? 'Enabled' : 'Disabled' }}</span>
              </label>
              @if (p.type === 'custom') {
                <button class="ap-del" (click)="removeCustom(p)" title="Remove"><i class="bi bi-trash3"></i></button>
              }
            </div>

            <div class="ap-cell ap-cell-fallback">
              <label class="ap-label">Fallback Target</label>
              <span class="ap-fall">{{ fallbackOf(p) }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './ai-provider.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProviderComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(AiProviderService);

  readonly providers = computed(() => this.service.providers());
  readonly checking = signal(false);

  readonly showAdd = signal(false);
  readonly addName = signal('');
  readonly addBaseUrl = signal('');
  readonly addModel = signal('');

  readonly chain = computed(() =>
    [...this.providers().filter(p => p.enabled)].sort((a, b) => a.priority - b.priority),
  );

  readonly healthyCount = computed(() => this.providers().filter(p => p.health !== 'down').length);
  readonly avgResponse = computed(() => {
    const list = this.providers().filter(p => p.responseTime > 0);
    if (!list.length) return 0;
    return Math.round(list.reduce((s, p) => s + p.responseTime, 0) / list.length);
  });
  readonly estCost = computed(() => {
    const sum = this.providers().reduce((s, p) => s + p.costPer1k * 300, 0);
    return sum.toFixed(2);
  });

  typeLabel(t: string): string {
    return providerTypeLabel(t as 'cloud' | 'local' | 'custom');
  }

  healthLabel(health: string): string {
    return modelHealthLabel(health as 'healthy' | 'degraded' | 'down');
  }

  latencyWidth(ms: number): string {
    if (!ms) return '0%';
    return Math.min(100, Math.round((ms / 1200) * 100)) + '%';
  }

  borderColor(health: string): string {
    return health === 'healthy' ? '#22c55e' : health === 'degraded' ? '#f59e0b' : '#dc2626';
  }

  shortSince(iso: string): string {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  isLast(i: number): boolean {
    return i >= this.chain().length - 1;
  }

  fallbackOf(p: AiProvider): string {
    if (!p.allowFallback) return 'No fallback';
    const next = [...this.chain()].find(c => c.priority > p.priority);
    return next ? `${next.name} (P${next.priority})` : 'None';
  }

  set(id: string, field: keyof AiProvider, value: unknown): void {
    this.service.update(id, { [field]: value } as Partial<AiProvider>);
  }

  toggle(id: string): void {
    const p = this.providers().find(x => x.id === id);
    if (!p) return;
    this.service.update(id, { enabled: !p.enabled });
  }

  movePriority(id: string, delta: number): void {
    this.service.movePriority(id, delta);
  }

  runCheck(): void {
    this.checking.set(true);
    window.setTimeout(() => {
      this.service.runHealthCheck();
      this.checking.set(false);
      this.toast.success('Health check complete — latency and status updated');
    }, 900);
  }

  addCustom(): void {
    this.showAdd.set(true);
    window.setTimeout(() => document.getElementById('ap-add-name')?.focus(), 0);
  }

  saveAdd(): void {
    const name = this.addName().trim();
    if (!name) return;
    this.service.addCustom({
      name,
      icon: 'bi-plus-square',
      color: '#c9a54c',
      type: 'custom',
      baseUrl: this.addBaseUrl().trim() || 'https://example.com/v1',
      apiKey: '',
      defaultModel: this.addModel().trim() || 'custom-model',
    });
    this.addName.set('');
    this.addBaseUrl.set('');
    this.addModel.set('');
    this.showAdd.set(false);
    this.toast.success(`Provider “${name}” added`);
  }

  removeCustom(p: AiProvider): void {
    if (confirm(`Remove custom provider “${p.name}”?`)) {
      this.service.removeCustom(p.id);
      this.toast.info(`Provider “${p.name}” removed`);
    }
  }

  reset(): void {
    if (confirm('Reset all providers to defaults?')) {
      this.service.reset();
      this.toast.info('Providers reset to defaults');
    }
  }
}