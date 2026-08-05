import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';

interface BrainExpert {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  expertise: string[];
  enabled: boolean;
  priority: number;
  weight: number;
  temperature: number;
  instructions: string;
}

const DEFAULT_EXPERTS: BrainExpert[] = [
  {
    id: 'brand',
    name: 'Brand Expert',
    role: 'Guardian of Vrindaya identity, tone and values',
    icon: 'bi-tags',
    color: '#0f6f84',
    expertise: ['Brand Voice', 'Tone Guard', 'Messaging'],
    enabled: true,
    priority: 1,
    weight: 90,
    temperature: 0.4,
    instructions: 'Always write as Vrindaya — a premium ethnic-wear label. Use the approved brand vocabulary (timeless, curated, elegant). Never use price-sensitive or desperate language.',
  },
  {
    id: 'fashion',
    name: 'Fashion Expert',
    role: 'Deep fashion knowledge, fabrics, silhouettes & occasions',
    icon: 'bi-palette',
    color: '#c9a54c',
    expertise: ['Fabrics', 'Silhouettes', 'Occasions'],
    enabled: true,
    priority: 2,
    weight: 80,
    temperature: 0.5,
    instructions: 'Ground every output in accurate fashion knowledge: fabric names, weaves, silhouettes, fit guidance and occasion appropriateness for Indian ethnic wear.',
  },
  {
    id: 'social',
    name: 'Social Media Expert',
    role: 'Platform-native captions, hooks and hashtag strategy',
    icon: 'bi-instagram',
    color: '#8b5cf6',
    expertise: ['Platform Format', 'Hooks', 'Hashtags'],
    enabled: true,
    priority: 3,
    weight: 75,
    temperature: 0.7,
    instructions: 'Write content native to the target platform. Lead with a hook, keep captions scannable, and include platform-appropriate hashtags and posting guidance.',
  },
  {
    id: 'copywriting',
    name: 'Copywriting Expert',
    role: 'Persuasive, clear and benefit-led copywriting',
    icon: 'bi-pencil-square',
    color: '#ec4899',
    expertise: ['Headlines', 'Storytelling', 'Clarity'],
    enabled: true,
    priority: 4,
    weight: 70,
    temperature: 0.6,
    instructions: 'Craft benefit-led copy that sells without sounding salesy. Use vivid but precise language, short sentences, and a clear narrative arc in longer formats.',
  },
  {
    id: 'seo',
    name: 'SEO Expert',
    role: 'Search keywords, metadata and discoverability',
    icon: 'bi-search-heart',
    color: '#22c55e',
    expertise: ['Keywords', 'Meta Data', 'Slugs'],
    enabled: true,
    priority: 5,
    weight: 60,
    temperature: 0.3,
    instructions: 'Inject SEO best practice: focus keywords, meta titles and descriptions within limits, natural keyword placement, and clean URL slug suggestions.',
  },
  {
    id: 'sales',
    name: 'Sales Expert',
    role: 'Conversion, offers and urgency management',
    icon: 'bi-graph-up-arrow',
    color: '#f59e0b',
    expertise: ['Conversion', 'Offers', 'CTA'],
    enabled: true,
    priority: 6,
    weight: 55,
    temperature: 0.6,
    instructions: 'Optimize for conversion: strong single CTAs, value reinforcement, limited-time framing when appropriate, and objection handling built into copy.',
  },
  {
    id: 'psychology',
    name: 'Customer Psychology Expert',
    role: 'Emotion, trust and decision drivers',
    icon: 'bi-emoji-smile',
    color: '#6366f1',
    expertise: ['Emotion', 'Social Proof', 'Trust'],
    enabled: false,
    priority: 7,
    weight: 50,
    temperature: 0.7,
    instructions: 'Apply psychology principles: emotional resonance, social proof, reciprocity and sensory language to increase desire and reduce purchase anxiety.',
  },
  {
    id: 'trend',
    name: 'Trend Expert',
    role: 'Current fashion and social media trends',
    icon: 'bi-graph-up',
    color: '#3b82f6',
    expertise: ['Trends', 'Cultural Cues', 'Seasonality'],
    enabled: false,
    priority: 8,
    weight: 45,
    temperature: 0.8,
    instructions: 'Reference current, relevant fashion and social trends without chasing fads. Keep brand voice authoritative and timeless while staying culturally current.',
  },
];

const STORAGE_KEY = 'vrindaya_ai_brain_config';

@Component({
  selector: 'app-ai-brain-config',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ab-page">
      <div class="ab-header">
        <div>
          <h1 class="ab-title"><i class="bi bi-cpu"></i> AI Brain Configuration</h1>
          <p class="ab-desc">Compose your intelligent AI team — each expert shapes the personality, tone and strategy of every generation.</p>
        </div>
        <div class="ab-actions">
          <button class="btn btn-outline-secondary ab-btn" (click)="resetDefaults()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn ab-btn-primary" (click)="saveConfig()">
            <i class="bi bi-check-lg"></i> Save Configuration
          </button>
        </div>
      </div>

      <div class="ab-team-strip">
        <div class="ab-team-summary">
          <span class="ab-summary-label">Active Team</span>
          <span class="ab-summary-value">{{ activeCount() }}/8 experts</span>
        </div>
        <div class="ab-avatars">
          @for (e of teamOrdered(); track e.id) {
            <button class="ab-avatar" [style.background]="e.color" [title]="'Priority ' + e.priority + ' · ' + e.name" (click)="selectExpert(e.id)">
              <i class="bi {{ e.icon }}"></i>
            </button>
          }
        </div>
        <div class="ab-team-stats">
          <span class="ab-stat"><i class="bi bi-thermometer-half"></i> Avg Temp {{ avgTemperature() }}</span>
          <span class="ab-stat"><i class="bi bi-sliders"></i> Avg Weight {{ avgWeight() }}%</span>
        </div>
      </div>

      <div class="ab-layout">
        <div class="ab-experts">
          @for (e of experts(); track e.id) {
            <div class="ab-expert" id="ab-expert-{{ e.id }}" [class.ab-expert-on]="e.enabled">
              <div class="ab-expert-head">
                <div class="ab-expert-id" [style.background]="e.color">
                  <i class="bi {{ e.icon }}"></i>
                </div>
                <div class="ab-expert-title">
                  <div class="ab-expert-name-row">
                    <strong class="ab-expert-name">{{ e.name }}</strong>
                    <span class="ab-expert-priority" [style.background]="e.color + '18'" [style.color]="e.color">P{{ e.priority }}</span>
                  </div>
                  <span class="ab-expert-role">{{ e.role }}</span>
                </div>
                <label class="ab-switch">
                  <input type="checkbox" [checked]="e.enabled" (change)="updateExpert(e.id, { enabled: !e.enabled })" />
                  <span class="ab-switch-track"></span>
                </label>
              </div>

              <div class="ab-expert-tags">
                @for (t of e.expertise; track t) {
                  <span class="ab-tag" [style.background]="e.color + '14'" [style.color]="e.color">{{ t }}</span>
                }
              </div>

              <div class="ab-expert-controls">
                <div class="ab-control-row">
                  <div class="ab-control">
                    <label class="ab-label">Priority</label>
                    <div class="ab-priority-group">
                      <button class="ab-step-btn" (click)="movePriority(e.id, -1)" [disabled]="e.priority <= 1"><i class="bi bi-chevron-up"></i></button>
                      <input class="ab-number" type="number" min="1" max="8" [(ngModel)]="e.priority" [disabled]="!e.enabled" />
                      <button class="ab-step-btn" (click)="movePriority(e.id, 1)" [disabled]="e.priority >= 8"><i class="bi bi-chevron-down"></i></button>
                    </div>
                  </div>
                  <div class="ab-control">
                    <label class="ab-label">Prompt Weight <span class="ab-value">{{ e.weight }}%</span></label>
                    <input type="range" class="ab-range" min="0" max="100" step="5" [(ngModel)]="e.weight" [disabled]="!e.enabled" />
                  </div>
                  <div class="ab-control">
                    <label class="ab-label">Temperature <span class="ab-value">{{ e.temperature.toFixed(1) }}</span></label>
                    <input type="range" class="ab-range" min="0" max="2" step="0.1" [(ngModel)]="e.temperature" [disabled]="!e.enabled" />
                  </div>
                </div>
              </div>

              <div class="ab-instructions">
                <label class="ab-label">System Instructions</label>
                <textarea class="ab-textarea" [(ngModel)]="e.instructions" rows="3" [disabled]="!e.enabled"
                          placeholder="Instructions that shape this expert's contribution..."></textarea>
              </div>
            </div>
          }
        </div>

        <div class="ab-side">
          <div class="ab-panel">
            <h3 class="ab-panel-title"><i class="bi bi-diagram-3"></i> Team Composition</h3>
            <p class="ab-panel-desc">Experts are combined by priority and prompt weight into the AI brain.</p>
            <div class="ab-composition">
              @for (e of teamOrdered(); track e.id) {
                <div class="ab-comp-row">
                  <span class="ab-comp-avatar" [style.background]="e.color"><i class="bi {{ e.icon }}"></i></span>
                  <div class="ab-comp-info">
                    <span class="ab-comp-name">{{ e.name }}</span>
                    <div class="progress ab-comp-bar">
                      <div class="progress-bar" [style.width.%]="e.weight" [style.background]="e.color"></div>
                    </div>
                  </div>
                  <span class="ab-comp-weight">{{ e.weight }}%</span>
                </div>
              }
              @if (activeCount() === 0) {
                <p class="ab-empty">No experts enabled. Enable at least one expert to activate the brain.</p>
              }
            </div>
          </div>

          <div class="ab-panel">
            <div class="ab-panel-head-row">
              <h3 class="ab-panel-title"><i class="bi bi-file-text"></i> System Prompt Preview</h3>
              <button class="ab-copy-btn" (click)="copyPrompt()" title="Copy prompt">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
            <pre class="ab-prompt">{{ teamPrompt() }}</pre>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-brain-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiBrainConfigComponent {
  private readonly toast = inject(ToastService);

  readonly experts = signal<BrainExpert[]>(this.load());

  readonly teamOrdered = computed(() =>
    [...this.experts().filter(e => e.enabled)].sort((a, b) => a.priority - b.priority),
  );

  readonly activeCount = computed(() => this.teamOrdered().length);

  readonly avgWeight = computed(() =>
    this.teamOrdered().length
      ? Math.round(this.teamOrdered().reduce((s, e) => s + e.weight, 0) / this.teamOrdered().length)
      : 0,
  );

  readonly avgTemperature = computed(() =>
    this.teamOrdered().length
      ? (this.teamOrdered().reduce((s, e) => s + e.temperature, 0) / this.teamOrdered().length).toFixed(1)
      : '—',
  );

  readonly teamPrompt = computed(() => {
    const active = this.teamOrdered();
    if (active.length === 0) return '// No experts enabled. Enable at least one expert to build the system prompt.';
    const lines = active.map(
      e => `[P${e.priority} · ${e.weight}% · temp ${e.temperature.toFixed(1)}] ${e.name}\n  ${e.instructions}`,
    );
    return lines.join('\n\n');
  });

  updateExpert(id: string, patch: Partial<BrainExpert>): void {
    this.experts.update(list => list.map(e => (e.id === id ? { ...e, ...patch } : e)));
    this.persist();
  }

  selectExpert(id: string): void {
    const el = document.getElementById('ab-expert-' + id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  movePriority(id: string, delta: number): void {
    this.experts.update(list => {
      const idx = list.findIndex(e => e.id === id);
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

  resetDefaults(): void {
    if (confirm('Reset AI Brain to default expert configuration?')) {
      this.experts.set(DEFAULT_EXPERTS.map(e => ({ ...e })));
      this.persist();
      this.toast.info('AI Brain reset to defaults');
    }
  }

  saveConfig(): void {
    this.persist();
    const active = this.teamOrdered().map(e => e.name).join(', ');
    this.toast.success(active ? `AI Brain saved — active team: ${active}` : 'AI Brain saved — no experts enabled');
  }

  copyPrompt(): void {
    navigator.clipboard.writeText(this.teamPrompt()).then(() => {
      this.toast.success('System prompt copied to clipboard');
    });
  }

  private load(): BrainExpert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BrainExpert[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_EXPERTS.map(e => ({ ...e }));
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.experts())); } catch { /* ignore */ }
  }
}