import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import {
  PROMPT_SOURCES,
  estimatePromptCost,
  estimateTokens,
  type PromptSourceDef,
  type PromptSourceId,
} from './models/prompt-orchestrator.model';

type PromptKind = 'raw' | 'optimized' | 'system' | 'developer' | 'user';

interface PromptBlock {
  kind: PromptKind;
  label: string;
  icon: string;
  accent: 'teal' | 'gold' | 'indigo' | 'rose' | 'green';
  text: string;
}

interface CompositionRow {
  id: PromptSourceId;
  label: string;
  color: string;
  pct: number;
}

const PLATFORM_OPTIONS = ['Email', 'Facebook', 'Flipkart', 'Instagram', 'Pinterest', 'Website Blog', 'WhatsApp'];

@Component({
  selector: 'app-prompt-orchestrator',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="po-page">
      <div class="po-header">
        <div>
          <h1 class="po-title"><i class="bi bi-mindmap"></i> Prompt Orchestrator</h1>
          <p class="po-desc">Compose prompts dynamically from brand, knowledge and strategy sources instead of sending a single flat prompt.</p>
        </div>
        <div class="po-actions">
          <label class="po-platform-label">Target Platform</label>
          <select class="form-select po-platform-select" [(ngModel)]="platform">
            @for (p of platforms; track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
          <button class="btn btn-outline-secondary po-btn" (click)="reset()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
        </div>
      </div>

      <div class="po-stats">
        <div class="po-stat">
          <i class="bi bi-123"></i>
          <div><span class="po-stat-value">{{ totalTokens() }}</span><span class="po-stat-label">Total Tokens</span></div>
        </div>
        <div class="po-stat">
          <i class="bi bi-currency-dollar"></i>
          <div><span class="po-stat-value">\${{ totalCost().toFixed(4) }}</span><span class="po-stat-label">Est. Cost</span></div>
        </div>
        <div class="po-stat">
          <i class="bi bi-layers"></i>
          <div><span class="po-stat-value">{{ activeSourceCount() }}</span><span class="po-stat-label">Active Sources</span></div>
        </div>
        <div class="po-stat">
          <i class="bi bi-stack"></i>
          <div><span class="po-stat-value">{{ activeItemCount() }}</span><span class="po-stat-label">Context Items</span></div>
        </div>
      </div>

      <div class="po-layout">
        <div class="po-config">
          <div class="po-config-head">
            <h3 class="po-section-title"><i class="bi bi-sliders"></i> Prompt Building Blocks</h3>
            <span class="po-config-hint">Toggle sources to include in the orchestrated prompt</span>
          </div>

          @for (src of sources(); track src.id) {
            <div class="po-source" [class.po-source-on]="isEnabled(src.id)">
              <div class="po-source-head">
                <div class="po-source-title">
                  <span class="po-source-icon" [style.background]="src.color"><i class="bi {{ src.icon }}"></i></span>
                  <div>
                    <strong>{{ src.label }}</strong>
                    <span class="po-source-desc">{{ src.description }}</span>
                  </div>
                </div>
                <label class="po-switch">
                  <input type="checkbox" [checked]="isEnabled(src.id)" (change)="toggleSource(src.id)" />
                  <span class="po-switch-track"></span>
                </label>
              </div>
              @if (isEnabled(src.id)) {
                <div class="po-items">
                  @for (item of src.items; track item.id) {
                    <label class="po-item">
                      <input type="checkbox" [checked]="isSelected(src.id, item.id)" (change)="toggleItem(src.id, item.id)" />
                      <span class="po-item-box"><i class="bi bi-check-lg"></i></span>
                      <span class="po-item-label">{{ item.label }}</span>
                      <span class="po-item-tokens">{{ estimateTokens(item.content) }}t</span>
                    </label>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="po-output">
          <div class="po-composition">
            <h3 class="po-section-title"><i class="bi bi-pie-chart"></i> Prompt Composition</h3>
            @if (composition().length === 0) {
              <p class="po-empty">Enable sources to see how the prompt is composed.</p>
            } @else {
              <div class="po-comp-list">
                @for (c of composition(); track c.id) {
                  <div class="po-comp-row">
                    <span class="po-comp-dot" [style.background]="c.color"></span>
                    <span class="po-comp-name">{{ c.label }}</span>
                    <div class="progress po-comp-bar">
                      <div class="progress-bar" [style.width.%]="c.pct" [style.background]="c.color"></div>
                    </div>
                    <span class="po-comp-pct">{{ c.pct }}%</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="po-prompt-list">
            @for (b of blocks(); track b.kind) {
              <div [class]="'po-prompt po-accent-' + b.accent">
                <div class="po-prompt-head">
                  <h4 class="po-prompt-title"><i class="bi {{ b.icon }}"></i> {{ b.label }}</h4>
                  <span class="po-prompt-tokens">
                    {{ estimateTokens(b.text) }} tokens · \${{ estimatePromptCost(estimateTokens(b.text)).toFixed(4) }}
                  </span>
                  <button class="po-copy-btn" (click)="copy(b.text, b.label)"><i class="bi bi-clipboard"></i> Copy</button>
                </div>
                <pre class="po-prompt-body">{{ b.text }}</pre>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './prompt-orchestrator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptOrchestratorComponent {
  readonly platforms = PLATFORM_OPTIONS;

  private readonly toast = inject(ToastService);

  readonly platform = signal('Instagram');
  readonly enabled = signal<Record<PromptSourceId, boolean>>({
    brand: true, knowledge: true, templates: true, campaign: true,
    audience: true, products: true, platform: true, voice: true, library: false,
  });
  readonly selected = signal<Record<PromptSourceId, string[]>>({
    brand: [], knowledge: [], templates: [], campaign: [], audience: [],
    products: [], platform: [], voice: [], library: [],
  });

  readonly sources = computed<PromptSourceDef[]>(() => PROMPT_SOURCES);
  readonly enabledSources = computed(() => PROMPT_SOURCES.filter(s => this.enabled()[s.id]));

  readonly estimateTokens = (text: string) => estimateTokens(text);
  readonly estimatePromptCost = (tokens: number) => estimatePromptCost(tokens);

  readonly isEnabled = (srcId: PromptSourceId): boolean => this.enabled()[srcId];
  readonly isSelected = (srcId: PromptSourceId, itemId: string): boolean =>
    this.selected()[srcId].includes(itemId);

  toggleSource(srcId: PromptSourceId): void {
    this.enabled.update(m => ({ ...m, [srcId]: !m[srcId] }));
  }

  toggleItem(srcId: PromptSourceId, itemId: string): void {
    this.selected.update(m => {
      const list = m[srcId];
      const next = list.includes(itemId) ? list.filter(i => i !== itemId) : [...list, itemId];
      return { ...m, [srcId]: next };
    });
  }

  reset(): void {
    const enabled: Record<PromptSourceId, boolean> = {
      brand: true, knowledge: true, templates: true, campaign: true,
      audience: true, products: true, platform: true, voice: true, library: false,
    };
    const selected: Record<PromptSourceId, string[]> = {
      brand: [], knowledge: [], templates: [], campaign: [], audience: [],
      products: [], platform: [], voice: [], library: [],
    };
    PROMPT_SOURCES.forEach(s => {
      if (s.id === 'brand' || s.id === 'voice' || s.id === 'platform') {
        selected[s.id] = s.items.map(i => i.id);
      }
    });
    this.enabled.set(enabled);
    this.selected.set(selected);
    this.platform.set('Instagram');
    this.toast.info('Orchestrator reset to defaults');
  }

  copy(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => this.toast.success(label + ' copied'));
  }

  readonly totalTokens = computed(() => this.blocks().reduce((n, b) => n + estimateTokens(b.text), 0));

  readonly totalCost = computed(() => estimatePromptCost(this.totalTokens()));

  readonly activeSourceCount = computed(() => this.enabledSources().length);

  readonly activeItemCount = computed(() =>
    this.enabledSources().reduce((n, s) => n + this.selected()[s.id].length, 0),
  );

  readonly composition = computed<CompositionRow[]>(() => {
    const raw = this.rawText();
    const total = raw.length || 1;
    return this.enabledSources()
      .map(s => {
        const chars = this.contentsOf(s.id).reduce((n, c) => n + c.length, 0);
        return {
          id: s.id,
          label: s.label,
          color: s.color,
          pct: chars > 0 ? Math.max(1, Math.round((chars / total) * 100)) : 0,
        };
      })
      .filter(c => c.pct > 0);
  });

  readonly blocks = computed<PromptBlock[]>(() => [
    { kind: 'raw', label: 'Raw Prompt', icon: 'bi-file-earmark', accent: 'teal', text: this.rawText() },
    { kind: 'optimized', label: 'Optimized Prompt', icon: 'bi-gear', accent: 'gold', text: this.optimizedText() },
    { kind: 'system', label: 'System Prompt', icon: 'bi-cpu', accent: 'indigo', text: this.systemText() },
    { kind: 'developer', label: 'Developer Prompt', icon: 'bi-code-slash', accent: 'rose', text: this.developerText() },
    { kind: 'user', label: 'User Prompt', icon: 'bi-person', accent: 'green', text: this.userText() },
  ]);

  private contentsOf(id: PromptSourceId): string[] {
    const def = PROMPT_SOURCES.find(d => d.id === id)!;
    return def.items.filter(i => this.selected()[id].includes(i.id)).map(i => i.content);
  }

  private collect(id: PromptSourceId): string[] {
    return this.enabled()[id] ? this.contentsOf(id) : [];
  }

  private readonly rawText = computed(() => {
    const parts: string[] = ['# Vrindaya AI Marketing Prompt — ' + this.platform()];
    this.enabledSources().forEach(s => {
      const items = this.collect(s.id);
      if (!items.length) return;
      parts.push('', '## ' + s.label);
      items.forEach(c => parts.push('- ' + c));
    });
    return parts.join('\n');
  });

  private readonly optimizedText = computed(() =>
    this.rawText()
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.trim().length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
  );

  private readonly systemText = computed(() => {
    const brand = this.collect('brand');
    const voice = this.collect('voice');
    const platform = this.collect('platform');
    return [
      'You are Vrindaya AI — the marketing brain for Vrindaya, a premium ethnic-wear brand.',
      '',
      '# Brand Mandate',
      ...(brand.length ? brand : ['Represent the Vrindaya brand with warmth and heritage.']),
      '',
      '# Brand Voice',
      ...(voice.length ? voice : ['Elegant, warm, confident.']),
      '',
      '# Platform Constraints',
      ...(platform.length ? platform : [`Produce native copy for ${this.platform()}.`]),
      '',
      'Rules: Always write for the specified platform. Never use desperate sales language. Output only the requested content.',
    ].join('\n');
  });

  private readonly developerText = computed(() => {
    const tpl = this.collect('templates');
    const examples = this.collect('library');
    return [
      'Role: Content generation engine.',
      '',
      'Instructions:',
      '- Use the selected template structure exactly.',
      '- Keep copy within platform character limits.',
      '- Match tone to Brand Voice; apply Knowledge facts only when relevant.',
      '- Return plain, publish-ready text with no scaffolding.',
      '',
      'Template Structure:',
      ...(tpl.length ? tpl : ['Hook → body → CTA.']),
      ...(examples.length ? ['', 'Few-shot Examples:', ...examples.map(e => '- ' + e)] : []),
    ].join('\n');
  });

  private readonly userText = computed(() => {
    const campaign = this.collect('campaign');
    const audience = this.collect('audience');
    const products = this.collect('products');
    const knowledge = this.collect('knowledge');
    return [
      '# Task',
      `Generate ${this.platform()} content for the current Vrindaya marketing focus.`,
      '',
      ...(campaign.length ? ['# Campaign', ...campaign] : []),
      ...(audience.length ? ['', '# Target Audience', ...audience] : []),
      ...(products.length ? ['', '# Product', ...products] : []),
      ...(knowledge.length ? ['', '# Knowledge Context', ...knowledge] : []),
      '',
      'Produce the final output now.',
    ].join('\n');
  });
}