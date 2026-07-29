import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketingService, TONE_OPTIONS } from './marketing.service';
import { MARKETING_TOOL_LABELS, MARKETING_TOOL_ICONS, type MarketingTool } from './models/marketing-campaign.model';
import { ToastService } from '../../../../../shared/services/toast.service';

type TabId = MarketingTool | 'history' | 'templates';

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
  { id: 'history', label: 'History', icon: 'bi-clock-history' },
  { id: 'templates', label: 'Templates', icon: 'bi-files' },
];

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
          @case ('instagram-post') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'instagram-post', tone: true }" /> }
          @case ('instagram-reel') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'instagram-reel', tone: true }" /> }
          @case ('facebook-post') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'facebook-post', tone: true }" /> }
          @case ('pinterest') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'pinterest', tone: true }" /> }
          @case ('whatsapp-catalog') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'whatsapp-catalog', tone: true }" /> }
          @case ('caption') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'caption', tone: true }" /> }
          @case ('hashtag') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'hashtag', tone: false }" /> }
          @case ('seo') { <ng-container *ngTemplateOutlet="genTpl; context: { tool: 'seo', tone: true, keywords: true }" /> }
          @case ('history') { <ng-container *ngTemplateOutlet="historyTpl" /> }
          @case ('templates') { <ng-container *ngTemplateOutlet="templatesTpl" /> }
        }
      </div>
    </div>

    <ng-template #genTpl let-tool="tool" let-showTone="tone" let-showKeywords="keywords">
      <div class="mk-card">
        <h3 class="mk-card-title">
          <i class="bi {{ icon(tool) }}"></i>
          {{ label(tool) }} Generator
        </h3>
        <p class="mk-card-desc">Generate AI-powered content for {{ label(tool).toLowerCase() }}.</p>

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

          @if (showKeywords) {
            <div class="mk-field">
              <label class="mk-label">Custom Keywords (comma separated)</label>
              <input class="mk-input" [(ngModel)]="inputs.keywords" placeholder="e.g. handwoven, summer wear, cotton" />
            </div>
          }

          @if (showTone) {
            <div class="mk-field">
              <label class="mk-label">Tone</label>
              <select class="mk-input" [(ngModel)]="inputs.tone">
                @for (t of tones; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
          }
        </div>

        <button class="btn btn-primary" (click)="generate(tool)" [disabled]="!canGenerate() || generating()">
          @if (generating()) {
            <span class="btn-spinner"></span> Generating...
          } @else {
            <i class="bi bi-magic"></i> Generate
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
  readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly tones = TONE_OPTIONS;

  readonly tabs = ALL_TABS;
  readonly activeTab = signal<TabId>('instagram-post');
  readonly generating = signal(false);
  readonly result = signal('');

  readonly inputs = {
    productName: '',
    productDesc: '',
    keywords: '',
    tone: 'professional',
  };

  readonly canGenerate = () => this.inputs.productName.trim().length > 0 && this.inputs.productDesc.trim().length > 0;
  readonly label = (t: MarketingTool) => MARKETING_TOOL_LABELS[t];
  readonly icon = (t: MarketingTool) => MARKETING_TOOL_ICONS[t];

  readonly promptTemplates = [
    { id: 'ig-post', name: 'Instagram Post', desc: 'Caption + hashtags + engagement', icon: 'bi-instagram', tool: 'instagram-post' as const, tone: true },
    { id: 'ig-reel', name: 'Instagram Reel', desc: 'Script with hook, visuals, CTA', icon: 'bi-camera-reels', tool: 'instagram-reel' as const, tone: true },
    { id: 'fb-post', name: 'Facebook Post', desc: 'Headline + body + hashtags', icon: 'bi-facebook', tool: 'facebook-post' as const, tone: true },
    { id: 'pin', name: 'Pinterest Pin', desc: 'SEO title + description + boards', icon: 'bi-pinterest', tool: 'pinterest' as const, tone: true },
    { id: 'wa-cat', name: 'WhatsApp Catalog', desc: 'Short name + description + CTA', icon: 'bi-whatsapp', tool: 'whatsapp-catalog' as const, tone: true },
    { id: 'cap', name: 'Short Caption', desc: 'Punchy one-line caption', icon: 'bi-chat-quote', tool: 'caption' as const, tone: true },
    { id: 'ht', name: 'Hashtag Pack', desc: '15 curated fashion hashtags', icon: 'bi-hash', tool: 'hashtag' as const, tone: false },
    { id: 'seo-gen', name: 'SEO Metadata', desc: 'Title + description + keywords', icon: 'bi-search-heart', tool: 'seo' as const, tone: true },
  ];

  generate(tool: MarketingTool): void {
    if (!this.canGenerate() || this.generating()) return;
    this.generating.set(true);
    this.result.set('');

    const { productName, productDesc, keywords, tone } = this.inputs;
    const method = this.getMethod(tool, productName, productDesc, tone, keywords);

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
      productName: this.inputs.productName,
      productId: undefined,
      prompt: this.inputs.productDesc,
      result: this.result(),
      tone: this.inputs.tone,
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

  private getMethod(tool: MarketingTool, name: string, desc: string, tone: string, keywords: string) {
    switch (tool) {
      case 'instagram-post': return this.svc.generateInstagramPost(name, desc, tone);
      case 'instagram-reel': return this.svc.generateInstagramReel(name, desc, tone);
      case 'facebook-post': return this.svc.generateFacebookPost(name, desc, tone);
      case 'pinterest': return this.svc.generatePinterestPin(name, desc, tone);
      case 'whatsapp-catalog': return this.svc.generateWhatsAppCatalog(name, desc, tone);
      case 'caption': return this.svc.generateCaption(name, desc, tone);
      case 'hashtag': return this.svc.generateHashtags(name, desc);
      case 'seo': return this.svc.generateSEO(name, desc, keywords);
    }
  }
}
