import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../shared/services/toast.service';
import {
  ORCHESTRATION_ROUTES,
  ORCHESTRATOR_MODULES,
  OrchestratorEnvelope,
  OrchestratorLogEntry,
  OrchestratorModule,
  OrchestratorModuleKey,
  OrchestrationRoute,
} from './models/ai-orchestrator.model';

type RunState = 'idle' | 'running' | 'done';

function stamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}

@Component({
  selector: 'app-ai-orchestrator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ao-page">
      <div class="ao-header">
        <div>
          <h1 class="ao-title"><i class="bi bi-diagram-3-fill"></i> AI Orchestrator</h1>
          <p class="ao-desc">The central brain of the AI Growth Engine — every request is routed, coordinated and returned through a single orchestration layer.</p>
        </div>
        <div class="ao-actions">
          <button class="btn btn-outline-secondary ao-btn" (click)="reset()" [disabled]="runState() === 'running'">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn ao-btn-primary" (click)="runRequest()" [disabled]="runState() === 'running'">
            @if (runState() === 'running') {
              <span class="ao-spinner"></span> Routing...
            } @else {
              <i class="bi bi-send"></i> Simulate Request
            }
          </button>
        </div>
      </div>

      <div class="ao-stats">
        <div class="ao-stat">
          <span class="ao-stat-value">{{ modules().length }}</span>
          <span class="ao-stat-label">Modules</span>
        </div>
        <div class="ao-stat">
          <span class="ao-stat-value">{{ requestsToday() }}</span>
          <span class="ao-stat-label">Requests Today</span>
        </div>
        <div class="ao-stat">
          <span class="ao-stat-value">{{ avgRouteTime() }}s</span>
          <span class="ao-stat-label">Avg Route Time</span>
        </div>
        <div class="ao-stat">
          <span class="ao-stat-value">{{ successRate() }}%</span>
          <span class="ao-stat-label">Success Rate</span>
        </div>
      </div>

      <div class="ao-layout">
        <div class="ao-main">
          <div class="ao-card">
            <div class="ao-card-head">
              <h3 class="ao-card-title"><i class="bi bi-diagram-3"></i> Orchestration Architecture</h3>
              <span class="ao-card-hint">Hub-and-spoke — all traffic passes through the orchestrator</span>
            </div>

            <div class="ao-flowline">
              <span class="ao-flow-node ao-flow-in"><i class="bi bi-box-arrow-in-right"></i> Request In</span>
              <span class="ao-flow-arrow"><i class="bi bi-arrow-right"></i></span>
              <span class="ao-flow-node ao-flow-hub"><i class="bi bi-cpu"></i> Orchestrator</span>
              <span class="ao-flow-arrow"><i class="bi bi-arrow-right"></i></span>
              <span class="ao-flow-node ao-flow-out"><i class="bi bi-box-arrow-up-right"></i> Response Out</span>
            </div>

            <div class="ao-map">
              <div class="ao-row">
                @for (m of mapTop(); track m.key) {
                  <div class="ao-cell">
                    <div class="ao-mod" [class.ao-mod-busy]="m.state === 'busy'">
                      <span class="ao-mod-icon" [style.background]="m.color"><i class="bi {{ m.icon }}"></i></span>
                      <span class="ao-mod-name">{{ m.name }}</span>
                      <span class="ao-mod-state" [class.ao-mod-state-ready]="m.state === 'ready'" [class.ao-mod-state-busy]="m.state === 'busy'" [class.ao-mod-state-degraded]="m.state === 'degraded'">{{ m.state }}</span>
                    </div>
                    <div class="ao-stub"></div>
                  </div>
                }
              </div>
              <div class="ao-bus"></div>
              <div class="ao-hub-row">
                <div class="ao-stub"></div>
                <div class="ao-hub">
                  <div class="ao-hub-icon"><i class="bi bi-diagram-3-fill"></i></div>
                  <div class="ao-hub-title">AI Orchestrator</div>
                  <div class="ao-hub-sub">Route · Coordinate · Return</div>
                  <div class="ao-hub-badges">
                    <span class="ao-hub-badge">Router</span>
                    <span class="ao-hub-badge">Registry</span>
                    <span class="ao-hub-badge">Fallback</span>
                  </div>
                </div>
                <div class="ao-stub"></div>
              </div>
              <div class="ao-bus"></div>
              <div class="ao-row">
                @for (m of mapBottom(); track m.key) {
                  <div class="ao-cell">
                    <div class="ao-mod" [class.ao-mod-busy]="m.state === 'busy'">
                      <span class="ao-mod-icon" [style.background]="m.color"><i class="bi {{ m.icon }}"></i></span>
                      <span class="ao-mod-name">{{ m.name }}</span>
                      <span class="ao-mod-state" [class.ao-mod-state-ready]="m.state === 'ready'" [class.ao-mod-state-busy]="m.state === 'busy'" [class.ao-mod-state-degraded]="m.state === 'degraded'">{{ m.state }}</span>
                    </div>
                    <div class="ao-stub"></div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="ao-card">
            <div class="ao-card-head">
              <h3 class="ao-card-title"><i class="bi bi-signpost-split"></i> Request Routing</h3>
              <span class="ao-card-hint">Select a request type to view its orchestrated path</span>
            </div>
            <div class="ao-routes">
              @for (r of routes(); track r.key) {
                <button class="ao-route" [class.ao-route-on]="r.key === routeKey()" (click)="selectRoute(r.key)">
                  <i class="bi {{ r.icon }}"></i> {{ r.label }}
                  <span class="ao-route-n">{{ r.path.length }}</span>
                </button>
              }
            </div>

            <div class="ao-path">
              @for (p of pathModules(); track p.key; let i = $index) {
                <div class="ao-hop">
                  <div class="ao-hop-node" [class.ao-hop-done]="hopClass(i) === 'ao-hop-done'" [class.ao-hop-running]="hopClass(i) === 'ao-hop-running'">
                    @if (hopClass(i) === 'ao-hop-running') {
                      <span class="ao-spinner ao-spinner-sm"></span>
                    } @else {
                      <span class="ao-hop-icon" [style.background]="p.color"><i class="bi {{ p.icon }}"></i></span>
                    }
                    <span class="ao-hop-name">{{ p.name }}</span>
                  </div>
                  @if (!isPathLast(i)) {
                    <span class="ao-hop-arrow"><i class="bi bi-arrow-right"></i></span>
                  }
                </div>
              }
            </div>

            <div class="ao-run-foot">
              <span class="ao-run-hint">Path: {{ pathSummary() }}</span>
              <button class="btn ao-btn-primary" (click)="runRequest()" [disabled]="runState() === 'running'">
                @if (runState() === 'running') {
                  <span class="ao-spinner"></span> Routing...
                } @else {
                  <i class="bi bi-send"></i> Run {{ selectedRoute()?.label ?? '' }}
                }
              </button>
            </div>

            @if (envelope()) {
              <div class="ao-envelope">
                <div class="ao-env-head">
                  <span class="ao-env-id">{{ envelope()!.requestId }}</span>
                  <span class="ao-env-status"><i class="bi bi-check-circle-fill"></i> {{ envelope()!.status }}</span>
                </div>
                <div class="ao-env-grid">
                  <div class="ao-env-item"><span>Route</span><strong>{{ envelope()!.route }}</strong></div>
                  <div class="ao-env-item"><span>Hops</span><strong>{{ envelope()!.path.length }}</strong></div>
                  <div class="ao-env-item"><span>Duration</span><strong>{{ envelope()!.duration }}ms</strong></div>
                  <div class="ao-env-item"><span>Timestamp</span><strong>{{ envelope()!.timestamp }}</strong></div>
                </div>
                <pre class="ao-env-body">{{ envelopeBody() }}</pre>
              </div>
            }
          </div>

          <div class="ao-card">
            <div class="ao-card-head">
              <h3 class="ao-card-title"><i class="bi bi-terminal"></i> Orchestration Console</h3>
              <button class="ao-link-btn" (click)="clearLog()"><i class="bi bi-x-lg"></i> Clear</button>
            </div>
            <div class="ao-console">
              @for (e of log(); track $index) {
                <div class="ao-log-row">
                  <span class="ao-log-time">{{ e.time }}</span>
                  <span class="ao-log-id">{{ e.requestId }}</span>
                  <span class="ao-log-ic"><i class="bi {{ e.ok ? 'bi-check2-circle' : 'bi-x-circle' }}"></i></span>
                  <span class="ao-log-text">{{ e.text }}</span>
                </div>
              }
              @if (log().length === 0) {
                <p class="ao-log-empty">Console ready. Run a request to trace orchestration hops.</p>
              }
            </div>
          </div>
        </div>

        <div class="ao-side">
          <div class="ao-card">
            <div class="ao-card-head">
              <h3 class="ao-card-title"><i class="bi bi-boxes"></i> Module Registry</h3>
              <span class="ao-card-hint">{{ enabledCount() }}/{{ modules().length }} active</span>
            </div>
            <div class="ao-registry">
              @for (m of modules(); track m.key) {
                <div class="ao-reg-row">
                  <span class="ao-reg-icon" [style.background]="m.color"><i class="bi {{ m.icon }}"></i></span>
                  <div class="ao-reg-info">
                    <span class="ao-reg-name">{{ m.name }}</span>
                    <span class="ao-reg-role">{{ m.role }}</span>
                    <span class="ao-reg-meta"><i class="bi bi-arrow-right-short"></i> {{ m.input }} <i class="bi bi-arrow-right"></i> {{ m.output }}</span>
                  </div>
                  <div class="ao-reg-right">
                    <span class="ao-reg-state" [class.ao-mod-state-ready]="m.state === 'ready'" [class.ao-mod-state-busy]="m.state === 'busy'" [class.ao-mod-state-degraded]="m.state === 'degraded'">{{ m.state }}</span>
                    <span class="ao-reg-stats">{{ m.calls | number }} · {{ m.latency }}ms</span>
                    <label class="ao-switch">
                      <input type="checkbox" [checked]="m.enabled" (change)="toggleModule(m.key)" />
                      <span class="ao-switch-track"></span>
                    </label>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="ao-card">
            <div class="ao-card-head">
              <h3 class="ao-card-title"><i class="bi bi-diagram-2"></i> Routing Table</h3>
              <span class="ao-card-hint">{{ routes().length }} routes</span>
            </div>
            <div class="ao-rtable">
              @for (r of routes(); track r.key) {
                <div class="ao-rt-row">
                  <span class="ao-rt-name"><i class="bi {{ r.icon }}"></i> {{ r.label }}</span>
                  <span class="ao-rt-path">{{ pathSummaryFor(r) }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-orchestrator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiOrchestratorComponent {
  private readonly toast = inject(ToastService);

  readonly routes = computed(() => ORCHESTRATION_ROUTES);
  readonly modules = signal<OrchestratorModule[]>(ORCHESTRATOR_MODULES.map(m => ({ ...m })));

  readonly routeKey = signal<OrchestrationRoute['key']>('content-post');
  readonly runState = signal<RunState>('idle');
  readonly activeHop = signal(-1);
  readonly envelope = signal<OrchestratorEnvelope | null>(null);
  readonly log = signal<OrchestratorLogEntry[]>([]);
  readonly requestsToday = signal(128);

  readonly selectedRoute = computed(() => ORCHESTRATION_ROUTES.find(r => r.key === this.routeKey()) ?? null);

  readonly pathModules = computed(() => {
    const route = this.selectedRoute();
    if (!route) return [];
    return route.path.map(key => this.modules().find(m => m.key === key)!);
  });

  readonly mapTop = computed(() => ['prompt', 'knowledge', 'memory', 'content', 'campaign']
    .map(k => this.modules().find(m => m.key === k)!));
  readonly mapBottom = computed(() => ['image', 'trend', 'seo', 'performance', 'recommendation']
    .map(k => this.modules().find(m => m.key === k)!));

  readonly enabledCount = computed(() => this.modules().filter(m => m.enabled).length);
  readonly avgRouteTime = computed(() => {
    const r = this.selectedRoute();
    if (!r) return '—';
    return (r.path.reduce((s, k) => s + this.modules().find(m => m.key === k)!.latency, 0) / 1000).toFixed(1);
  });
  readonly successRate = computed(() => {
    const total = this.log().length;
    if (!total) return 98;
    const ok = this.log().filter(e => e.ok).length;
    return Math.max(0, Math.round((ok / total) * 100));
  });

  readonly pathSummary = computed(() => this.pathModules().map(m => m.name).join(' → '));

  private runSeq = 0;

  pathSummaryFor(r: OrchestrationRoute): string {
    return r.path.map(k => this.modules().find(m => m.key === k)!.name.split(' ')[0]).join(' → ');
  }

  selectRoute(key: OrchestrationRoute['key']): void {
    if (this.runState() === 'running') return;
    this.routeKey.set(key);
    this.envelope.set(null);
    this.activeHop.set(-1);
    this.runState.set('idle');
  }

  toggleModule(key: OrchestratorModuleKey): void {
    this.modules.update(list => list.map(m => (m.key === key ? { ...m, enabled: !m.enabled } : m)));
  }

  hopClass(i: number): string {
    if (this.runState() !== 'running') return 'ao-hop-pending';
    if (i < this.activeHop()) return 'ao-hop-done';
    if (i === this.activeHop()) return 'ao-hop-running';
    return 'ao-hop-pending';
  }

  isPathLast(i: number): boolean {
    return i >= this.pathModules().length - 1;
  }

  clearLog(): void {
    this.log.set([]);
  }

  reset(): void {
    if (this.runState() === 'running') return;
    this.modules.set(ORCHESTRATOR_MODULES.map(m => ({ ...m })));
    this.envelope.set(null);
    this.activeHop.set(-1);
    this.runState.set('idle');
    this.log.set([]);
    this.toast.info('Orchestrator state reset');
  }

  runRequest(): void {
    const route = this.selectedRoute();
    if (!route || this.runState() === 'running') return;

    const seq = ++this.runSeq;
    const reqId = `REQ-${1000 + seq}`;
    const path = route.path.filter(key => this.modules().find(m => m.key === key)!.enabled);
    if (path.length === 0) {
      this.toast.info('No active modules on this route — enable modules first');
      return;
    }

    this.runState.set('running');
    this.activeHop.set(-1);
    this.envelope.set(null);
    this.pushLog(reqId, `Request accepted → route "${route.label}" (${path.length} hops)`, true);

    const start = Date.now();
    let totalMs = 0;
    const runHop = (idx: number): void => {
      if (seq !== this.runSeq) return;
      if (idx >= path.length) {
        const envelope: OrchestratorEnvelope = {
          requestId: reqId,
          route: route.label,
          path,
          duration: Date.now() - start,
          status: '200 OK',
          timestamp: stamp(),
        };
        this.envelope.set(envelope);
        this.requestsToday.update(v => v + 1);
        this.pushLog(reqId, `Response returned — ${envelope.status} in ${envelope.duration}ms`, true);
        this.runState.set('done');
        this.activeHop.set(-1);
        this.toast.success(`Orchestrated "${route.label}" — ${envelope.duration}ms`);
        return;
      }

      const key = path[idx];
      this.activeHop.set(idx);
      this.markState(key, 'busy');
      this.pushLog(reqId, `Hop ${idx + 1}/${path.length} → ${this.modules().find(m => m.key === key)!.name}`, true);

      window.setTimeout(() => {
        if (seq !== this.runSeq) return;
        this.completeHop(key);
        const latency = this.modules().find(m => m.key === key)!.latency;
        totalMs += latency;
        window.setTimeout(() => runHop(idx + 1), 160);
      }, 420);
    };

    runHop(0);
  }

  private markState(key: OrchestratorModuleKey, state: OrchestratorModule['state']): void {
    this.modules.update(list => list.map(m => (m.key === key ? { ...m, state } : m)));
  }

  private completeHop(key: OrchestratorModuleKey): void {
    this.modules.update(list =>
      list.map(m => {
        if (m.key !== key) return m;
        const jitter = Math.round(m.latency * (0.85 + Math.random() * 0.4));
        return { ...m, state: 'ready' as OrchestratorModule['state'], calls: m.calls + 1, latency: jitter };
      }),
    );
  }

  private pushLog(requestId: string, text: string, ok: boolean): void {
    const entry: OrchestratorLogEntry = { time: stamp(), requestId, text, ok };
    this.log.update(list => [...list, entry].slice(-60));
  }

  envelopeBody(): string {
    const e = this.envelope();
    if (!e) return '';
    return [
      `{`,
      `  "requestId": "${e.requestId}",`,
      `  "route": "${e.route}",`,
      `  "path": [${e.path.map(k => `"${k}"`).join(', ')}],`,
      `  "duration": ${e.duration},`,
      `  "status": "${e.status}",`,
      `  "timestamp": "${e.timestamp}"`,
      `}`,
    ].join('\n');
  }
}