import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketingService } from './marketing.service';
import { MarketingPresetService, PRESET_CATEGORIES } from './marketing-preset.service';
import {
  DEFAULT_PRESET_CONFIG,
  type MarketingPreset,
  type MarketingPresetConfig,
  type MarketingPresetDraft,
  type PresetCategory,
} from './models/marketing-preset.model';
import {
  MARKETING_PLATFORMS,
  MARKETING_TOOL_LABELS,
  MARKETING_TOOL_ICONS,
  PRESET_TONE_OPTIONS,
  PRESET_LENGTH_OPTIONS,
  PRESET_CTA_OPTIONS,
  type MarketingTool,
} from './models/marketing-platform.model';
import { ToastService } from '../../../../../shared/services/toast.service';

type TabId = MarketingTool | 'history' | 'templates' | 'presets';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const ALL_TABS: TabDef[] = [
  { id: 'instagram-post', label: 'IG Post', icon: 'bi-instagram' },
  { id: 'instagram-reel', label: 'IG Reel', icon: 'bi-camera-reels' },
  { id: 'facebook-post', label: 'Facebook', icon: 'bi-facebook' },
  { id: 'pinterest', label: 'Pinterest', icon: 'bi-pinterest' },
  { id: 'whatsapp-catalog', label: 'WhatsApp', icon: 'bi-whatsapp' },
  { id: 'caption', label: 'Caption', icon: 'bi-chat-quote' },
  { id: 'hashtag', label: 'Hashtags', icon: 'bi-hash' },
  { id: 'seo', label: 'SEO', icon: 'bi-search-heart' },
  { id: 'blog', label: 'Blog', icon: 'bi-journal-text' },
  { id: 'flipkart', label: 'Flipkart', icon: 'bi-bag' },
  { id: 'landing', label: 'Landing Page', icon: 'bi-window' },
  { id: 'email', label: 'Email', icon: 'bi-envelope-paper' },
  { id: 'history', label: 'History', icon: 'bi-clock-history' },
  { id: 'presets', label: 'Presets', icon: 'bi-stars' },
  { id: 'templates', label: 'Templates', icon: 'bi-files' },
];

interface PresetEditor {
  id?: string;
  name: string;
  category: PresetCategory;
  platform?: string;
  favorite: boolean;
  config: MarketingPresetConfig;
}

interface MarketingInputs {
  productName: string;
  productDesc: string;
  tone: string;
  keywords: string;
  audience: string;
  cta: string;
  length: string;
  subject: string;
  heading: string;
  emojis: boolean;
  hashtags: boolean;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mp-page">
      <div class="mp-header">
        <div>
          <h1 class="mp-title">Marketing AI Tools</h1>
          <p class="mp-subtitle">Generate platform-optimised content for your products</p>
        </div>
        <div class="mp-actions">
          <span class="badge" [class.bg-success]="svc.isReady()" [class.bg-secondary]="!svc.isReady()">
            {{ svc.isReady() ? 'AI Ready' : 'AI Not Configured' }}
          </span>
        </div>
      </div>

      <div class="mk-tabs">
        @for (tab of tabs; track tab.id) {
          <button class="mk-tab" [class.active]="activeTab() === tab.id"
                  (click)="activeTab.set(tab.id)">
            <i class="bi {{ tab.icon }}"></i>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <div class="mk-content">
        @switch (activeTab()) {
          @case ('instagram-post') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'instagram-post' }" /> }
          @case ('instagram-reel') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'instagram-reel' }" /> }
          @case ('facebook-post') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'facebook-post' }" /> }
          @case ('pinterest') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'pinterest' }" /> }
          @case ('whatsapp-catalog') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'whatsapp-catalog' }" /> }
          @case ('caption') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'caption' }" /> }
          @case ('hashtag') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'hashtag' }" /> }
          @case ('seo') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'seo' }" /> }
          @case ('blog') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'blog' }" /> }
          @case ('flipkart') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'flipkart' }" /> }
          @case ('landing') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'landing' }" /> }
          @case ('email') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'email' }" /> }
          @case ('history') { <ng-container *ngTemplateOutlet="historyTpl" /> }
          @case ('presets') { <ng-container *ngTemplateOutlet="presetsTpl" /> }
          @case ('templates') { <ng-container *ngTemplateOutlet="templatesTpl" /> }
        }
      </div>
    </div>

    <ng-template #genTpl let-tool="tool">
      <div class="mk-card">
        <h3 class="mk-card-title">
          <i class="bi {{ icon(tool) }}"></i>
          {{ label(tool) }} Generator
        </h3>
        <p class="mk-card-desc">{{ platform(tool)?.desc }}</p>

        <div class="mk-form">
          <div class="mk-field">
            <label class="mk-label">Product Name</label>
            <input class="mk-input" [(ngModel)]="inputs.productName" placeholder="e.g. Embroidered Cotton Kurta" />
          </div>

          <div class="mk-field">
            <label class="mk-label">Product Description</label>
            <textarea class="mk-input mk-textarea" [(ngModel)]="inputs.productDesc"
                      placeholder="Describe the product — fabric, colour, occasion, features..." rows="3"></textarea>
          </div>

          @for (f of platform(tool)?.fields ?? []; track f.key) {
            <div class="mk-field">
              <label class="mk-label">{{ f.label }}</label>
              @switch (f.kind) {
                @case ('toggle') {
                  <label class="mk-toggle">
                    <input type="checkbox" [(ngModel)]="inputs[f.key]" />
                    <span class="mk-toggle-track"></span>
                    <span class="mk-toggle-label">{{ inputs[f.key] ? 'On' : 'Off' }}</span>
                  </label>
                }
                @case ('select') {
                  <select class="mk-input" [(ngModel)]="inputs[f.key]">
                    @for (o of f.options ?? []; track o.value) {
                      <option [value]="o.value">{{ o.label }}</option>
                    }
                  </select>
                }
                @case ('textarea') {
                  <textarea class="mk-input mk-textarea" [(ngModel)]="inputs[f.key]"
                            [placeholder]="f.placeholder" rows="2"></textarea>
                }
                @default {
                  <input class="mk-input" [(ngModel)]="inputs[f.key]" [placeholder]="f.placeholder" />
                }
              }
            </div>
          }
        </div>

        <button class="btn btn-primary" (click)="generate(tool)" [disabled]="!canGenerate() || generating()">
          @if (generating()) {
            <span class="btn-spinner"></span> Generating...
          } @else {
            <i class="bi bi-magic"></i> Generate {{ label(tool) }}
          }
        </button>
      </div>

      @if (result()) {
        <div class="mk-card mk-result">
          <div class="mk-result-header">
            <h4 class="mk-card-title">Generated {{ label(tool) }}</h4>
            <div class="mk-result-actions">
              <button class="btn btn-sm btn-outline-secondary" (click)="copyResult()" title="Copy to clipboard">
                <i class="bi bi-clipboard"></i>
              </button>
              <button class="btn btn-sm btn-outline-success" (click)="saveResult(tool)" title="Save to history">
                <i class="bi bi-save"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary" (click)="regenerate(tool)" title="Regenerate">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
          <pre class="mk-result-text">{{ result() }}</pre>
        </div>
      }
    </ng-template>

    <ng-template #historyTpl>
      <div class="mk-card">
        <div class="mk-card-header-row">
          <h3 class="mk-card-title"><i class="bi bi-clock-history"></i> Campaign History</h3>
          @if (svc.campaigns().length > 0) {
            <button class="btn btn-sm btn-outline-danger" (click)="clearHistory()">
              <i class="bi bi-trash"></i> Clear All
            </button>
          }
        </div>
        <p class="mk-card-desc">View all previously generated marketing content.</p>

        @if (svc.campaigns().length === 0) {
          <div class="mk-empty">No campaigns yet. Generate content above and save it here.</div>
        } @else {
          <div class="mk-table-wrap">
            <table class="mk-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Label</th>
                  <th>Product</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of svc.campaigns(); track c.id) {
                  <tr>
                    <td><i class="bi {{ icon(c.tool) }}"></i> {{ label(c.tool) }}</td>
                    <td>{{ c.label }}</td>
                    <td>{{ c.productName }}</td>
                    <td class="text-muted small">{{ c.createdAt | date:'medium' }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-danger" (click)="svc.deleteCampaign(c.id)" title="Delete">
                        <i class="bi bi-x"></i>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="5"><pre class="mk-result-text mk-history-preview">{{ c.result }}</pre></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </ng-template>

    <ng-template #presetsTpl>
      <div class="mk-card">
        <div class="mk-card-header-row">
          <div>
            <h3 class="mk-card-title"><i class="bi bi-stars"></i> AI Presets</h3>
            <p class="mk-card-desc">One-tap configurations for the generator. Apply a preset and every option is set for you.</p>
          </div>
          <button class="btn btn-primary" (click)="openCreate()">
            <i class="bi bi-plus-lg"></i> New Preset
          </button>
        </div>

        <div class="mk-preset-toolbar">
          <div class="mk-preset-search">
            <i class="bi bi-search"></i>
            <input class="mk-input" [(ngModel)]="presetSearch" placeholder="Search presets..." />
          </div>
          <div class="mk-preset-cats">
            @for (c of presetCategories; track c) {
              <button class="mk-cat-pill" [class.active]="presetCategory() === c" (click)="presetCategory.set(c)">
                {{ c }}
              </button>
            }
          </div>
        </div>

        @if (filteredPresets().length === 0) {
          <div class="mk-empty">No presets found. Try a different search or category.</div>
        } @else {
          <div class="mk-preset-grid">
            @for (p of filteredPresets(); track p.id) {
              <div class="mk-preset-card" [class.fav]="p.favorite">
                <div class="mk-preset-card-head">
                  <div class="mk-preset-info">
                    <strong>{{ p.name }}</strong>
                    <span class="mk-preset-meta">
                      <span class="badge badge-soft">{{ p.category }}</span>
                      @if (p.platform) {
                        <span class="mk-preset-platform"><i class="bi {{ icon(p.platform) }}"></i> {{ label(p.platform) }}</span>
                      }
                    </span>
                  </div>
                  <button class="mk-icon-btn" [class.active]="p.favorite" (click)="togglePresetFavorite(p)" title="Favorite">
                    <i class="bi {{ p.favorite ? 'bi-star-fill' : 'bi-star' }}"></i>
                  </button>
                </div>
                <p class="mk-preset-desc">{{ presetSummary(p) }}</p>
                <div class="mk-preset-actions">
                  <button class="btn btn-sm btn-primary" (click)="applyPreset(p)">
                    <i class="bi bi-lightning"></i> Apply
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="openEdit(p)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" (click)="duplicatePreset(p)" title="Duplicate">
                    <i class="bi bi-files"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="deletePreset(p)" title="Delete">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (editing(); as e) {
        <div class="modal fade show d-block" tabindex="-1" role="dialog">
          <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-stars"></i> {{ e.id ? 'Edit' : 'New' }} Preset</h5>
                <button type="button" class="btn-close" (click)="closeEditor()"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-8">
                    <div class="mk-field">
                      <label class="mk-label">Preset Name</label>
                      <input class="mk-input" [(ngModel)]="e.name" placeholder="e.g. Wedding Collection" />
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mk-field">
                      <label class="mk-label">Category</label>
                      <select class="mk-input" [(ngModel)]="e.category">
                        @for (c of presetCategories; track c) {
                          @if (c !== 'All') {
                            <option [value]="c">{{ c }}</option>
                          }
                        }
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Target Platform</label>
                      <select class="mk-input" [(ngModel)]="e.platform">
                        <option [ngValue]="undefined">Any platform</option>
                        @for (pl of platforms; track pl.id) {
                          <option [ngValue]="pl.id">{{ pl.label }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6 d-flex align-items-end">
                    <label class="mk-toggle">
                      <input type="checkbox" [(ngModel)]="e.favorite" />
                      <span class="mk-toggle-track"></span>
                      <span class="mk-toggle-label">Mark as favorite</span>
                    </label>
                  </div>

                  <div class="col-12"><hr /></div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Tone</label>
                      <select class="mk-input" [(ngModel)]="e.config.tone">
                        @for (o of toneOptions; track o.value) {
                          <option [value]="o.value">{{ o.label }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Length</label>
                      <select class="mk-input" [(ngModel)]="e.config.length">
                        @for (o of lengthOptions; track o.value) {
                          <option [value]="o.value">{{ o.label }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Primary CTA</label>
                      <select class="mk-input" [(ngModel)]="e.config.cta">
                        @for (o of ctaOptions; track o.value) {
                          <option [value]="o.value">{{ o.label }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Target Audience</label>
                      <input class="mk-input" [(ngModel)]="e.config.audience" placeholder="e.g. young professionals" />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Custom Keywords</label>
                      <input class="mk-input" [(ngModel)]="e.config.keywords" placeholder="comma separated" />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Hero Headline</label>
                      <input class="mk-input" [(ngModel)]="e.config.heading" placeholder="optional" />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mk-field">
                      <label class="mk-label">Subject Line</label>
                      <input class="mk-input" [(ngModel)]="e.config.subject" placeholder="optional" />
                    </div>
                  </div>
                  <div class="col-md-6 d-flex align-items-end gap-3 pb-1">
                    <label class="mk-toggle">
                      <input type="checkbox" [(ngModel)]="e.config.emojis" />
                      <span class="mk-toggle-track"></span>
                      <span class="mk-toggle-label">Emojis</span>
                    </label>
                    <label class="mk-toggle">
                      <input type="checkbox" [(ngModel)]="e.config.hashtags" />
                      <span class="mk-toggle-track"></span>
                      <span class="mk-toggle-label">Hashtags</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" (click)="closeEditor()">Cancel</button>
                <button type="button" class="btn btn-primary" (click)="savePreset()" [disabled]="!e.name.trim()">
                  <i class="bi bi-check-lg"></i> Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-backdrop fade show"></div>
      }
    </ng-template>

    <ng-template #templatesTpl>
      <div class="mk-card">
        <h3 class="mk-card-title"><i class="bi bi-files"></i> Template Library</h3>
        <p class="mk-card-desc">Pre-built prompt templates for each marketing platform. Select a template to pre-fill the generator.</p>

        <div class="mk-templates-grid">
          @for (t of promptTemplates; track t.id) {
            <div class="mk-template-card" (click)="applyTemplate(t)">
              <div class="mk-template-icon"><i class="bi {{ t.icon }}"></i></div>
              <div class="mk-template-info">
                <strong>{{ t.name }}</strong>
                <span class="text-muted small">{{ t.desc }}</span>
              </div>
              <i class="bi bi-arrow-right-short mk-template-arrow"></i>
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './marketing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingComponent {
  readonly svc = inject(MarketingService);
  readonly presetSvc = inject(MarketingPresetService);
  readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly platforms = MARKETING_PLATFORMS;
  readonly toneOptions = PRESET_TONE_OPTIONS;
  readonly lengthOptions = PRESET_LENGTH_OPTIONS;
  readonly ctaOptions = PRESET_CTA_OPTIONS;
  readonly presetCategories = ['All', ...PRESET_CATEGORIES];

  readonly tabs = ALL_TABS;
  readonly activeTab = signal<TabId>('instagram-post');
  readonly generating = signal(false);
  readonly result = signal('');

  readonly inputs: MarketingInputs & Record<string, string | boolean> = {
    productName: '',
    productDesc: '',
    tone: 'professional',
    keywords: '',
    audience: '',
    cta: 'Shop Now',
    length: 'medium',
    subject: '',
    heading: '',
    emojis: false,
    hashtags: true,
  };

  readonly canGenerate = () =>
    String(this.inputs.productName).trim().length > 0 && String(this.inputs.productDesc).trim().length > 0;

  readonly platform = (t: MarketingTool) => MARKETING_PLATFORMS.find(p => p.id === t);
  readonly label = (t: MarketingTool) => MARKETING_TOOL_LABELS[t] ?? t;
  readonly icon = (t: MarketingTool) => MARKETING_TOOL_ICONS[t] ?? 'bi-gem';

  readonly promptTemplates = MARKETING_PLATFORMS.map(p => ({
    id: p.id,
    name: p.label,
    desc: p.desc,
    icon: p.icon,
    tool: p.id as MarketingTool,
  }));

  readonly presets = this.presetSvc.presets;
  readonly presetSearch = signal('');
  readonly presetCategory = signal<string>('All');
  readonly editing = signal<PresetEditor | null>(null);

  readonly filteredPresets = (): MarketingPreset[] => {
    const q = this.presetSearch().trim().toLowerCase();
    const cat = this.presetCategory();
    return this.presets().filter(p =>
      (cat === 'All' || p.category === cat) &&
      (q === '' || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
    );
  };

  readonly presetSummary = (p: MarketingPreset): string => {
    const c = p.config;
    const parts = [c.tone, c.length, c.cta];
    if (c.audience) parts.push(`for ${c.audience}`);
    if (c.keywords) parts.push(`#${c.keywords.split(',').slice(0, 3).join(', ')}`);
    return parts.filter(Boolean).join(' · ');
  };

  openCreate(): void {
    this.editing.set({
      name: '',
      category: 'Essentials',
      platform: undefined,
      favorite: false,
      config: { ...DEFAULT_PRESET_CONFIG },
    });
  }

  openEdit(p: MarketingPreset): void {
    this.editing.set({
      id: p.id,
      name: p.name,
      category: p.category,
      platform: p.platform,
      favorite: p.favorite,
      config: { ...p.config },
    });
  }

  closeEditor(): void {
    this.editing.set(null);
  }

  savePreset(): void {
    const e = this.editing();
    if (!e || !e.name.trim()) return;
    const draft: MarketingPresetDraft = {
      name: e.name.trim(),
      category: e.category,
      platform: e.platform as MarketingTool | undefined,
      favorite: e.favorite,
      config: { ...e.config },
    };
    if (e.id) {
      this.presetSvc.update(e.id, draft);
      this.toast.success('Preset updated');
    } else {
      this.presetSvc.create(draft);
      this.toast.success('Preset created');
    }
    this.editing.set(null);
  }

  applyPreset(p: MarketingPreset): void {
    const c = p.config;
    this.inputs.tone = c.tone;
    this.inputs.length = c.length;
    this.inputs.cta = c.cta;
    this.inputs.keywords = c.keywords;
    this.inputs.audience = c.audience;
    this.inputs.subject = c.subject;
    this.inputs.heading = c.heading;
    this.inputs.emojis = c.emojis;
    this.inputs.hashtags = c.hashtags;
    if (p.platform) this.activeTab.set(p.platform as TabId);
    this.toast.success(`Preset "${p.name}" applied`);
  }

  duplicatePreset(p: MarketingPreset): void {
    this.presetSvc.duplicate(p.id);
    this.toast.info(`Duplicated "${p.name}"`);
  }

  togglePresetFavorite(p: MarketingPreset): void {
    this.presetSvc.toggleFavorite(p.id);
  }

  deletePreset(p: MarketingPreset): void {
    if (confirm(`Delete preset "${p.name}"?`)) {
      this.presetSvc.remove(p.id);
      this.toast.info('Preset deleted');
    }
  }

  generate(tool: MarketingTool): void {
    if (!this.canGenerate() || this.generating()) return;
    this.generating.set(true);
    this.result.set('');

    const val = (k: string, d = '') => String(this.inputs[k] ?? d);
    const flag = (k: string, d = false) => Boolean(this.inputs[k] ?? d);

    const name = val('productName');
    const desc = val('productDesc');
    const tone = val('tone', 'professional');

    const method = this.getMethod(
      tool, name, desc, tone, val, flag,
    );

    method.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.result.set(res.text);
        this.generating.set(false);
        this.toast.success(`${this.label(tool)} generated successfully`);
      },
      error: err => {
        this.generating.set(false);
        this.toast.error(`Generation failed: ${err.message}`);
      },
    });
  }

  regenerate(tool: MarketingTool): void {
    this.generate(tool);
  }

  saveResult(tool: MarketingTool): void {
    this.svc.saveCampaign({
      tool,
      label: this.label(tool),
      productName: String(this.inputs.productName),
      productId: undefined,
      prompt: String(this.inputs.productDesc),
      result: this.result(),
      tone: String(this.inputs.tone),
      platform: tool,
    });
    this.toast.success('Saved to campaign history');
  }

  copyResult(): void {
    navigator.clipboard.writeText(this.result()).then(() => {
      this.toast.success('Copied to clipboard');
    });
  }

  clearHistory(): void {
    if (confirm('Clear all campaign history?')) {
      this.svc.clearHistory();
      this.toast.info('History cleared');
    }
  }

  applyTemplate(t: typeof this.promptTemplates[0]): void {
    this.activeTab.set(t.tool);
    this.toast.info(`Switched to ${t.name}`);
  }

  private getMethod(
    tool: MarketingTool,
    name: string,
    desc: string,
    tone: string,
    val: (k: string, d?: string) => string,
    flag: (k: string, d?: boolean) => boolean,
  ) {
    switch (tool) {
      case 'instagram-post': return this.svc.generateInstagramPost(name, desc, tone, flag('emojis', true), flag('hashtags', true));
      case 'instagram-reel': return this.svc.generateInstagramReel(name, desc, tone, val('audience'));
      case 'facebook-post': return this.svc.generateFacebookPost(name, desc, tone, flag('hashtags', true), val('cta', 'Shop Now'));
      case 'pinterest': return this.svc.generatePinterestPin(name, desc, tone);
      case 'whatsapp-catalog': return this.svc.generateWhatsAppCatalog(name, desc, tone, val('cta', 'Shop Now'));
      case 'caption': return this.svc.generateCaption(name, desc, tone, flag('emojis', true));
      case 'hashtag': return this.svc.generateHashtags(name, desc);
      case 'seo': return this.svc.generateSEO(name, desc, val('keywords'));
      case 'blog': return this.svc.generateBlog(name, desc, tone, val('audience'), val('length', 'medium'), val('keywords'));
      case 'flipkart': return this.svc.generateFlipkart(name, desc, tone, val('cta', 'Shop Now'), val('keywords'));
      case 'landing': return this.svc.generateLanding(name, desc, tone, val('audience'), val('heading'), val('length', 'medium'), val('cta', 'Shop Now'), val('keywords'));
      case 'email': return this.svc.generateEmail(name, desc, tone, val('subject'), val('audience'), val('length', 'medium'), val('cta', 'Shop Now'));
    }
  }
}