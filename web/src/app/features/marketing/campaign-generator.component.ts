import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { CampaignGeneratorService } from './campaign-generator.service';
import {
  CAMPAIGN_TONES,
  CampaignResult,
  DeliverableType,
  deliverableDef,
} from './models/campaign-generator.model';

@Component({
  selector: 'app-campaign-generator',
  standalone: true,
  imports: [],
  template: `
    <div class="cg-page">
      <div class="cg-header">
        <div>
          <h1 class="cg-title"><i class="bi bi-megaphone"></i> Campaign Generator</h1>
          <p class="cg-desc">Give us one product and get a full campaign — a card for every channel, ready to publish.</p>
        </div>
        <div class="cg-actions">
          <button class="btn btn-outline-secondary cg-btn" (click)="clearHistory()" [disabled]="history().length === 0">
            <i class="bi bi-trash3"></i> Clear History
          </button>
          <button class="btn cg-btn-primary" (click)="generate()" [disabled]="loading() || !product().trim()">
            @if (loading()) {
              <span class="cg-spinner"></span> Generating...
            } @else {
              <i class="bi bi-lightning-charge"></i> Generate Campaign
            }
          </button>
        </div>
      </div>

      <div class="cg-input">
        <div class="cg-field cg-field-product">
          <label class="cg-label"><i class="bi bi-box-seam"></i> Product</label>
          <input class="form-control cg-input-ui" [value]="product()" placeholder="One product — e.g. Zari Luxe Anarkali"
            (input)="product.set($any($event.target).value)" (keyup.enter)="generate()" />
        </div>
        <div class="cg-field">
          <label class="cg-label"><i class="bi bi-sliders"></i> Campaign Tone</label>
          <select class="form-select cg-input-ui" [value]="tone()" (change)="tone.set($any($event.target).value)">
            @for (t of tones(); track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div class="cg-field cg-field-cta">
          <span class="cg-label">&nbsp;</span>
          <button class="btn cg-btn-primary cg-gen" (click)="generate()" [disabled]="loading() || !product().trim()">
            @if (loading()) {
              <span class="cg-spinner"></span> Generating...
            } @else {
              <i class="bi bi-stars"></i> Generate
            }
          </button>
        </div>
      </div>

      @if (result()) {
        <div class="cg-summary">
          <div class="cg-sum-main">
            <span class="cg-sum-product"><i class="bi bi-bag-heart"></i> {{ result()!.productName }}</span>
            <span class="cg-sum-tone">Tone · {{ result()!.tone }}</span>
            <span class="cg-sum-date">{{ dateLabel(result()!.createdAt) }}</span>
          </div>
          <div class="cg-sum-stats">
            <span class="cg-sum-stat"><strong>{{ result()!.items.length }}</strong> channels</span>
            <span class="cg-sum-stat"><strong>{{ totalWords() }}</strong> words</span>
            <span class="cg-sum-stat"><strong>{{ estimatedTokens() }}</strong> est. tokens</span>
          </div>
        </div>
      }

      @if (result()) {
        <div class="cg-cards">
          @for (item of result()!.items; track item.type) {
            <div class="cg-card">
              <div class="cg-card-head">
                <span class="cg-card-ic" [style.background]="def(item.type).color"><i class="bi {{ def(item.type).icon }}"></i></span>
                <div class="cg-card-titlebox">
                  <span class="cg-card-title">{{ def(item.type).label }}</span>
                  <span class="cg-card-platform">{{ def(item.type).platform }}</span>
                </div>
                <span class="cg-card-meta">{{ item.words }} words</span>
              </div>
              <div class="cg-card-desc">{{ def(item.type).description }}</div>
              <pre class="cg-card-body">{{ item.content }}</pre>
              <div class="cg-card-foot">
                <button class="cg-action" (click)="copy(item)"><i class="bi bi-clipboard"></i> Copy</button>
                <button class="cg-action" (click)="regenerate(item.type)"><i class="bi bi-arrow-clockwise"></i> Regenerate</button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="cg-placeholder">
          <i class="bi bi-megaphone"></i>
          <h3>Build a campaign from one product</h3>
          <p>Enter a product above and we'll mock up all 10 channel deliverables as campaign cards — post, reel, story, carousel, Pinterest, banner, SEO, Flipkart, email and WhatsApp.</p>
        </div>
      }

      @if (history().length > 0) {
        <div class="cg-history">
          <div class="cg-history-head">
            <h3 class="cg-history-title"><i class="bi bi-clock-history"></i> Recent Campaigns</h3>
          </div>
          <div class="cg-history-list">
            @for (h of history(); track h.id) {
              <button class="cg-hchip" (click)="openHistory(h)">
                <i class="bi bi-megaphone"></i>
                <span class="cg-hinfo">
                  <span class="cg-hname">{{ h.productName }}</span>
                  <span class="cg-hdate">{{ dateLabel(h.createdAt) }} · {{ h.tone }}</span>
                </span>
                <i class="bi bi-chevron-right"></i>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './campaign-generator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignGeneratorComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(CampaignGeneratorService);

  readonly tones = computed(() => CAMPAIGN_TONES);
  readonly history = computed(() => this.service.history());

  readonly product = signal('');
  readonly tone = signal('Heritage Premium');
  readonly loading = signal(false);
  readonly result = signal<CampaignResult | null>(null);

  readonly totalWords = computed(() => this.result()?.items.reduce((s, i) => s + i.words, 0) ?? 0);
  readonly estimatedTokens = computed(() => Math.round(this.totalWords() * 1.35));

  def(type: DeliverableType) {
    return deliverableDef(type);
  }

  dateLabel(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  generate(): void {
    const name = this.product().trim();
    if (!name || this.loading()) return;
    this.loading.set(true);
    window.setTimeout(() => {
      this.result.set(this.service.generate(name, this.tone()));
      this.loading.set(false);
      this.toast.success(`Campaign generated for "${name}" — 10 deliverables`);
    }, 800);
  }

  regenerate(type: DeliverableType): void {
    const current = this.result();
    if (!current) return;
    const item = current.items.find(i => i.type === type);
    if (!item) return;
    const fresh = this.service.regenerateItem(item, current.productName, current.tone);
    this.result.update(r => (r ? { ...r, items: r.items.map(i => (i.type === type ? fresh : i)) } : r));
    this.toast.info(`${this.def(type).label} regenerated`);
  }

  async copy(item: { type: DeliverableType; content: string }): Promise<void> {
    try {
      await navigator.clipboard.writeText(item.content);
      this.toast.success(`${this.def(item.type).label} copied`);
    } catch {
      this.toast.info('Could not access clipboard');
    }
  }

  openHistory(h: CampaignResult): void {
    this.result.set(h);
    this.product.set(h.productName);
    this.tone.set(h.tone);
    this.toast.info(`Loaded campaign "${h.productName}"`);
  }

  clearHistory(): void {
    if (confirm('Clear campaign history?')) {
      this.service.clearHistory();
      this.toast.info('Campaign history cleared');
    }
  }
}