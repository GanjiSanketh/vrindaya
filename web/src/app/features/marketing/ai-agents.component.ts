import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';

interface AiAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
  goal: string;
  prompt: string;
  priority: number;
  temperature: number;
  enabled: boolean;
}

const DEFAULT_AGENTS: AiAgent[] = [
  {
    id: 'strategist',
    name: 'Content Strategist',
    icon: 'bi-lightbulb',
    color: '#0f6f84',
    role: 'Plans content pillars, cadence and the editorial mix.',
    goal: 'Maximise engagement and brand loyalty through a consistent content plan.',
    prompt: 'Define editorial themes, the content mix (educational, inspirational, promotional) and a weekly publishing cadence aligned to the brand calendar.',
    priority: 1,
    temperature: 0.8,
    enabled: true,
  },
  {
    id: 'creative',
    name: 'Creative Director',
    icon: 'bi-easel',
    color: '#8b5cf6',
    role: 'Owns the overall visual and narrative direction.',
    goal: 'Keep every piece of content on-brand and premium.',
    prompt: 'Review every generation for brand congruence: composition, mood, colour and storytelling that feels luxury yet approachable.',
    priority: 2,
    temperature: 0.7,
    enabled: true,
  },
  {
    id: 'fashion',
    name: 'Fashion Consultant',
    icon: 'bi-palette',
    color: '#c9a54c',
    role: 'Advises on styling, silhouettes and occasions.',
    goal: 'Recommend outfits that are accurate, flattering and occasion-appropriate.',
    prompt: 'Ground styling advice in fabric, fit and occasion knowledge; suggest silhouettes by body type and dress-code context.',
    priority: 3,
    temperature: 0.5,
    enabled: true,
  },
  {
    id: 'prompt',
    name: 'Prompt Engineer',
    icon: 'bi-code-slash',
    color: '#6366f1',
    role: 'Crafts precise, structured prompts from strategy.',
    goal: 'Turn high-level goals into high-quality, repeatable prompts.',
    prompt: 'Assemble prompts from brand, knowledge, template and platform context. Keep instructions explicit, ordered and free of ambiguity.',
    priority: 4,
    temperature: 0.3,
    enabled: true,
  },
  {
    id: 'image',
    name: 'Image Director',
    icon: 'bi-image',
    color: '#22c55e',
    role: 'Directs visual and AI image generation.',
    goal: 'Produce on-brand imagery that matches the brand visual language.',
    prompt: 'Define image direction: mood, palette, composition and textile detail. Ensure images feel editorial, warm and heritage-driven.',
    priority: 5,
    temperature: 0.6,
    enabled: true,
  },
  {
    id: 'seo',
    name: 'SEO Strategist',
    icon: 'bi-search-heart',
    color: '#0ea5e9',
    role: 'Drives search discoverability across channels.',
    goal: 'Rank for relevant fashion keywords on web and marketplace.',
    prompt: 'Inject focus keywords, meta titles and descriptions within limits, and clean slug suggestions without sounding stuffed.',
    priority: 6,
    temperature: 0.3,
    enabled: true,
  },
  {
    id: 'growth',
    name: 'Growth Manager',
    icon: 'bi-rocket-takeoff',
    color: '#f59e0b',
    role: 'Owns audience growth and retention.',
    goal: 'Turn content into followers and repeat customers.',
    prompt: 'Recommend content plays, cross-promotions and retargeting angles that convert discovery into loyal community.',
    priority: 7,
    temperature: 0.6,
    enabled: true,
  },
  {
    id: 'instagram',
    name: 'Instagram Manager',
    icon: 'bi-instagram',
    color: '#ec4899',
    role: 'Runs the Instagram presence day-to-day.',
    goal: 'Grow reach and engagement on Instagram.',
    prompt: 'Follow the feed and reel plays: hooks, hashtag policy, optimal posting times and engagement-driving CTAs.',
    priority: 8,
    temperature: 0.7,
    enabled: true,
  },
  {
    id: 'trend',
    name: 'Trend Analyst',
    icon: 'bi-graph-up-arrow',
    color: '#14b8a6',
    role: 'Tracks fashion and social media trends.',
    goal: 'Keep the brand relevant without chasing fleeting fads.',
    prompt: 'Surface current, credible fashion and social trends; recommend only those that fit the Vrindaya premium-heritage voice.',
    priority: 9,
    temperature: 0.8,
    enabled: true,
  },
];

const STORAGE_KEY = 'vrindaya_ai_agents';

@Component({
  selector: 'app-ai-agents',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ag-page">
      <div class="ag-header">
        <div>
          <h1 class="ag-title"><i class="bi bi-robot"></i> AI Agents</h1>
          <p class="ag-desc">A professional crew of AI agents, each with a defined role, goal and system prompt that shapes generation.</p>
        </div>
        <div class="ag-actions">
          <button class="btn btn-outline-secondary ag-btn" (click)="reset()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn ag-btn-primary" (click)="save()">
            <i class="bi bi-check-lg"></i> Save Agents
          </button>
        </div>
      </div>

      <div class="ag-team-strip">
        <div class="ag-team-summary">
          <span class="ag-summary-label">Active Crew</span>
          <span class="ag-summary-value">{{ activeCount() }}/9 agents</span>
        </div>
        <div class="ag-avatars">
          @for (a of teamOrdered(); track a.id) {
            <button class="ag-avatar" [style.background]="a.color" [title]="'P' + a.priority + ' · ' + a.name" (click)="jumpTo(a.id)">
              <i class="bi {{ a.icon }}"></i>
            </button>
          }
        </div>
        <div class="ag-team-stats">
          <span class="ag-stat"><i class="bi bi-thermometer-half"></i> Avg Temp {{ avgTemperature() }}</span>
          <span class="ag-stat"><i class="bi bi-sort-numeric-down"></i> Avg Priority {{ avgPriority() }}</span>
        </div>
      </div>

      <div class="ag-layout">
        <div class="ag-agents">
          @for (a of agents(); track a.id) {
            <div class="ag-agent" id="ag-agent-{{ a.id }}" [class.ag-agent-on]="a.enabled">
              <div class="ag-agent-head">
                <div class="ag-agent-avatar" [style.background]="a.color">
                  <i class="bi {{ a.icon }}"></i>
                </div>
                <div class="ag-agent-title">
                  <div class="ag-agent-name-row">
                    <strong class="ag-agent-name">{{ a.name }}</strong>
                    <span class="ag-agent-priority" [style.background]="a.color + '18'" [style.color]="a.color">P{{ a.priority }}</span>
                  </div>
                  <span class="ag-agent-role">{{ a.role }}</span>
                </div>
                <label class="ag-switch">
                  <input type="checkbox" [checked]="a.enabled" (change)="updateAgent(a.id, { enabled: !a.enabled })" />
                  <span class="ag-switch-track"></span>
                </label>
              </div>

              <div class="ag-fields">
                <div class="ag-field">
                  <label class="ag-label">Goal</label>
                  <input class="form-control ag-input" [(ngModel)]="a.goal" [disabled]="!a.enabled" />
                </div>
                <div class="ag-row">
                  <div class="ag-control">
                    <label class="ag-label">Priority</label>
                    <div class="ag-priority-group">
                      <button class="ag-step-btn" (click)="movePriority(a.id, -1)" [disabled]="a.priority <= 1"><i class="bi bi-chevron-up"></i></button>
                      <input class="ag-number" type="number" min="1" max="9" [(ngModel)]="a.priority" [disabled]="!a.enabled" />
                      <button class="ag-step-btn" (click)="movePriority(a.id, 1)" [disabled]="a.priority >= 9"><i class="bi bi-chevron-down"></i></button>
                    </div>
                  </div>
                  <div class="ag-control">
                    <label class="ag-label">Temperature <span class="ag-value">{{ a.temperature.toFixed(1) }}</span></label>
                    <input type="range" class="ag-range" min="0" max="2" step="0.1" [(ngModel)]="a.temperature" [disabled]="!a.enabled" />
                  </div>
                </div>
                <div class="ag-field">
                  <label class="ag-label">Goal Prompt</label>
                  <textarea class="form-control ag-input ag-textarea" [(ngModel)]="a.prompt" rows="3" [disabled]="!a.enabled"></textarea>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="ag-side">
          <div class="ag-panel">
            <h3 class="ag-panel-title"><i class="bi bi-people-fill"></i> Active Crew</h3>
            <p class="ag-panel-desc">Agents ordered by priority in the team.</p>
            <div class="ag-list">
              @for (a of teamOrdered(); track a.id) {
                <div class="ag-comp-row">
                  <span class="ag-comp-avatar" [style.background]="a.color"><i class="bi {{ a.icon }}"></i></span>
                  <div class="ag-comp-info">
                    <span class="ag-comp-name">{{ a.name }}</span>
                    <span class="ag-comp-sub">Temp {{ a.temperature.toFixed(1) }}</span>
                  </div>
                  <span class="ag-comp-priority">{{ a.priority }}</span>
                </div>
              }
              @if (activeCount() === 0) {
                <p class="ag-empty">No agents enabled. Enable at least one agent.</p>
              }
            </div>
          </div>

          <div class="ag-panel ag-summary-panel">
            <h3 class="ag-panel-title"><i class="bi bi-activity"></i> Agent Summary</h3>
            <div class="ag-summary-tiles">
              <div class="ag-tile">
                <span class="ag-tile-value">{{ activeCount() }}</span>
                <span class="ag-tile-label">Active</span>
              </div>
              <div class="ag-tile">
                <span class="ag-tile-value">{{ disabledCount() }}</span>
                <span class="ag-tile-label">Inactive</span>
              </div>
              <div class="ag-tile">
                <span class="ag-tile-value">{{ avgTemperature() }}</span>
                <span class="ag-tile-label">Avg Temp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-agents.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAgentsComponent {
  private readonly toast = inject(ToastService);

  readonly agents = signal<AiAgent[]>(this.load());

  readonly teamOrdered = computed(() =>
    [...this.agents().filter(a => a.enabled)].sort((x, y) => x.priority - y.priority),
  );

  readonly activeCount = computed(() => this.teamOrdered().length);
  readonly disabledCount = computed(() => this.agents().length - this.activeCount());

  readonly avgTemperature = computed(() =>
    this.teamOrdered().length
      ? (this.teamOrdered().reduce((s, a) => s + a.temperature, 0) / this.teamOrdered().length).toFixed(1)
      : '—',
  );

  readonly avgPriority = computed(() =>
    this.teamOrdered().length
      ? (this.teamOrdered().reduce((s, a) => s + a.priority, 0) / this.teamOrdered().length).toFixed(1)
      : '—',
  );

  updateAgent(id: string, patch: Partial<AiAgent>): void {
    this.agents.update(list => list.map(a => (a.id === id ? { ...a, ...patch } : a)));
    this.persist();
  }

  jumpTo(id: string): void {
    document.getElementById('ag-agent-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  movePriority(id: string, delta: number): void {
    this.agents.update(list => {
      const idx = list.findIndex(a => a.id === id);
      const next = idx + delta;
      if (idx < 0 || next < 0 || next >= list.length) return list;
      const copy = [...list];
      const cur = copy[idx];
      const other = copy[next];
      copy[idx] = { ...cur, priority: other.priority };
      copy[next] = { ...other, priority: cur.priority };
      return copy;
    });
    this.persist();
  }

  reset(): void {
    if (confirm('Reset AI Agents to the default crew?')) {
      this.agents.set(DEFAULT_AGENTS.map(a => ({ ...a })));
      this.persist();
      this.toast.info('AI Agents reset to defaults');
    }
  }

  save(): void {
    this.persist();
    const names = this.teamOrdered().map(a => a.name).join(', ');
    this.toast.success(names ? `Agents saved — active crew: ${names}` : 'Agents saved — no active agents');
  }

  private load(): AiAgent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AiAgent[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_AGENTS.map(a => ({ ...a }));
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.agents())); } catch { /* ignore */ }
  }
}