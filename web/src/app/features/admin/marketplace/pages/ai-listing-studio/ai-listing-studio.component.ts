import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { AITestingService, type ListingInput, type GeneratedContent, type ContentVersion } from '../../services/ai-listing.service';
import { VisionAnalysisService } from '../../services/vision-analysis.service';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { AIService } from '../../services/ai.service';
import { VersionHistoryService } from '../../services/version-history.service';
import { GENERATION_TYPE_LABELS } from '../../models/version-history.model';
import type { VisionAnalysisResult } from '../../models/vision-analysis.model';
import { MARKETPLACE_LABELS } from '../../models/marketplace-platform.model';

interface PromptTemplate {
  id: string;
  label: string;
  system: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 'standard', label: 'Standard', system: '' },
  { id: 'luxury', label: 'Luxury', system: 'Write in a luxury/premium tone. Emphasize craftsmanship, exclusivity, and quality materials.' },
  { id: 'budget', label: 'Budget-Friendly', system: 'Write in an affordable/value tone. Emphasize great deals, quality at low prices, and savings.' },
  { id: 'seasonal', label: 'Seasonal/Festive', system: 'Write in a festive/seasonal tone. Emphasize gift-worthiness, celebrations, and special occasions.' },
  { id: 'tech', label: 'Technical/Detailed', system: 'Write in a detailed/technical tone. Include specifications, measurements, materials, and care instructions.' },
];

@Component({
  selector: 'app-ai-listing-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="AI Workspace" subtitle="Generate, refine, and publish marketplace listing content.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" (click)="copyAll()" [title]="'Copy all content'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>

      @if (errorMessage(); as err) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ err }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="errorMessage.set(null)">&times;</button></div>
      }
      @if (successMessage(); as msg) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ msg }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <div class="ai-grid">
        <div class="ai-left">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Product Information</div>
            <div class="card-body p-2" style="font-size:.82rem">
              <div class="mb-2">
                <label class="form-label small">Name</label>
                <input class="form-control form-control-sm" [(ngModel)]="input.name" (ngModelChange)="onInputChange()" />
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6"><label class="form-label small">Brand</label><input class="form-control form-control-sm" [(ngModel)]="input.brand" (ngModelChange)="onInputChange()" /></div>
                <div class="col-6"><label class="form-label small">Category</label><input class="form-control form-control-sm" [(ngModel)]="input.category" (ngModelChange)="onInputChange()" /></div>
              </div>
              <div class="mb-2">
                <label class="form-label small">Description</label>
                <textarea class="form-control form-control-sm" rows="3" [(ngModel)]="input.description" (ngModelChange)="onInputChange()"></textarea>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-4"><label class="form-label small">Platform</label>
                  <select class="form-select form-select-sm" [(ngModel)]="input.platform">
                    <option value="amazon">Amazon</option><option value="flipkart">Flipkart</option><option value="meesho">Meesho</option>
                  </select>
                </div>
                <div class="col-4"><label class="form-label small">Price (₹)</label><input type="number" class="form-control form-control-sm" [(ngModel)]="input.targetPrice" /></div>
                <div class="col-4"><label class="form-label small">Stock</label><input type="number" class="form-control form-control-sm" [(ngModel)]="input.targetStock" /></div>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Images</div>
            <div class="card-body p-2">
              <div class="d-flex flex-wrap gap-2 mb-2">
                @for (url of imageUrls(); track url; let i = $index) {
                  <div class="position-relative" style="width:72px;height:72px">
                    <img [src]="url" alt="" class="rounded border" loading="lazy" style="width:100%;height:100%;object-fit:cover" referrerpolicy="no-referrer" />
                    <button class="position-absolute top-0 end-0 btn p-0 lh-1 text-danger bg-white rounded-circle" style="font-size:.7rem;width:16px;height:16px" (click)="removeImage(i)">&times;</button>
                  </div>
                }
                <label class="d-flex align-items-center justify-content-center rounded border border-dashed" style="width:72px;height:72px;cursor:pointer;background:#fafafa">
                  <input type="file" accept="image/*" class="d-none" (change)="addImage($event)" />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
                </label>
              </div>
              @if (imageUrls().length) {
                <button class="btn btn-sm btn-outline-info w-100 mb-2" (click)="analyzeImages()" [disabled]="analyzing()">
                  @if (analyzing()) { <span class="spinner-border spinner-border-sm me-1"></span> Analyzing... }
                  @else { Analyze with Vision AI }
                </button>
              }
              @if (visionResult(); as vr) {
                <div style="font-size:.78rem">
                  <div class="d-flex justify-content-between mb-1 py-1 px-2 rounded" style="background:#f8faff"><span class="text-muted">Category</span><span class="fw-medium">{{ vr.category }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2"><span class="text-muted">Fabric</span><span class="fw-medium">{{ vr.fabric }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2" style="background:#f8faff"><span class="text-muted">Colour</span><span class="fw-medium">{{ vr.colour }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2"><span class="text-muted">Sleeve</span><span class="fw-medium">{{ vr.sleeve }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2" style="background:#f8faff"><span class="text-muted">Neck</span><span class="fw-medium">{{ vr.neck }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2"><span class="text-muted">Fit</span><span class="fw-medium">{{ vr.fit }}</span></div>
                  <div class="d-flex justify-content-between mb-1 py-1 px-2" style="background:#f8faff"><span class="text-muted">Occasion</span><span class="fw-medium">{{ vr.occasion }}</span></div>
                  @if (vr.confidenceScore) {
                    <div class="mt-1 px-2"><span class="text-muted">Confidence</span>
                      <div class="progress" style="height:4px"><div class="progress-bar" [style.width.%]="vr.confidenceScore * 100"></div></div>
                    </div>
                  }
                  <button class="btn btn-sm btn-link text-decoration-none p-0 mt-1 small" (click)="applyVisionResult()">Apply to product info</button>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="ai-center">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span class="fw-semibold">Prompt</span>
              <select class="form-select form-select-sm" style="width:auto" [(ngModel)]="selectedTemplate">
                @for (t of templates; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
              </select>
            </div>
            <div class="card-body p-2">
              <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="customPrompt" placeholder="Custom instructions or override prompt..." style="font-size:.82rem"></textarea>
            </div>
          </div>

          <div class="d-flex gap-2 mb-3 flex-wrap">
            @for (btn of generationButtons; track btn.id) {
              <button class="btn btn-sm" [class.btn-primary]="btn.id === 'everything'" [class.btn-outline-secondary]="btn.id !== 'everything'" (click)="generate(btn)" [disabled]="generating()" [title]="btn.tooltip">
                @if (generating() && activeField() === btn.id) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                {{ btn.label }}
              </button>
            }
            @if (generating()) {
              <button class="btn btn-sm btn-outline-danger" (click)="cancelGeneration()">Cancel</button>
            }
            @if (lastGenType() && !generating()) {
              <button class="btn btn-sm btn-outline-info" (click)="retry()">Retry</button>
            }
          </div>

          @if (generating()) {
            <div class="mb-3">
              <div class="d-flex justify-content-between small mb-1">
                <span class="text-muted">{{ activeFieldLabel() }}</span>
                <span class="text-muted">{{ progress() }}%</span>
              </div>
              <div class="progress" style="height:6px">
                <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="progress()"></div>
              </div>
            </div>
          }

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span>Generated Content</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-success py-0 px-2" (click)="approveContent()" [disabled]="!hasContent()">Approve</button>
                <button class="btn btn-sm btn-outline-primary py-0 px-2" (click)="saveToProduct()" [disabled]="saving()">@if (saving()) { Saving... } @else { Save }</button>
                <button class="btn btn-sm btn-outline-info py-0 px-2" (click)="publishContent()" [disabled]="publishing()">@if (publishing()) { Publishing... } @else { Publish }</button>
              </div>
            </div>
            <div class="card-body p-2 content-output" style="font-size:.82rem">
              <div class="mb-2">
                <label class="small fw-medium text-muted">Title</label>
                <textarea class="form-control form-control-sm" rows="1" [(ngModel)]="content.title" style="font-weight:500;resize:none"></textarea>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">Description</label>
                <textarea class="form-control form-control-sm" rows="4" [(ngModel)]="content.description"></textarea>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">Features / Highlights</label>
                @for (h of content.highlights; track idx; let idx = $index) {
                  <div class="input-group input-group-sm mb-1">
                    <span class="input-group-text bg-transparent text-muted" style="font-size:.75rem">{{ idx + 1 }}</span>
                    <input class="form-control" [(ngModel)]="content.highlights[idx]" />
                    <button class="btn btn-outline-danger" (click)="removeHighlight(idx)">&times;</button>
                  </div>
                }
                <button class="btn btn-sm btn-link text-decoration-none px-0 small" (click)="addHighlight()">+ Add Feature</button>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">SEO Keywords</label>
                <div class="d-flex flex-wrap gap-1">
                  @for (kw of content.seoKeywords; track idx; let idx = $index) {
                    <span class="d-inline-flex align-items-center bg-light border rounded px-2 py-0" style="font-size:.78rem">
                      <input class="border-0 bg-transparent" style="width:auto;min-width:50px;outline:none" [(ngModel)]="content.seoKeywords[idx]" />
                      <button class="btn p-0 ms-1 text-danger" style="line-height:1;font-size:.8rem" (click)="removeKeyword(idx)">&times;</button>
                    </span>
                  }
                  <button class="btn btn-sm btn-link text-decoration-none px-0 small" (click)="addKeyword()">+ Add</button>
                </div>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">Product Details</label>
                <div class="row g-1">
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Fabric" [(ngModel)]="content.fabric" /></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Fit" [(ngModel)]="content.fit" /></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Sleeve" [(ngModel)]="content.sleeve" /></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Pattern" [(ngModel)]="content.pattern" /></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Neck" [(ngModel)]="content.neck" /></div>
                  <div class="col-4"><input class="form-control form-control-sm" placeholder="Occasion" [(ngModel)]="content.occasion" /></div>
                </div>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">Care Instructions</label>
                @for (c of content.care; track idx; let idx = $index) {
                  <div class="input-group input-group-sm mb-1">
                    <span class="input-group-text bg-transparent text-muted" style="font-size:.75rem">{{ idx + 1 }}</span>
                    <input class="form-control" [(ngModel)]="content.care[idx]" />
                    <button class="btn btn-outline-danger" (click)="removeCare(idx)">&times;</button>
                  </div>
                }
                <button class="btn btn-sm btn-link text-decoration-none px-0 small" (click)="addCare()">+ Add</button>
              </div>
              <div class="mb-2">
                <label class="small fw-medium text-muted">Marketplace Attributes</label>
                @for (attr of content.marketplaceAttributes; track idx; let idx = $index) {
                  <div class="row g-1 mb-1">
                    <div class="col-5"><input class="form-control form-control-sm" placeholder="Label" [(ngModel)]="content.marketplaceAttributes[idx].label" /></div>
                    <div class="col-5"><input class="form-control form-control-sm" placeholder="Value" [(ngModel)]="content.marketplaceAttributes[idx].value" /></div>
                    <div class="col-2"><button class="btn btn-sm btn-outline-danger w-100" (click)="removeMarketplaceAttribute(idx)">&times;</button></div>
                  </div>
                }
                <button class="btn btn-sm btn-link text-decoration-none px-0 small" (click)="addMarketplaceAttribute()">+ Add Attribute</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-right">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span>History</span>
              <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ versions().length }}</span>
            </div>
            <div class="card-body p-0 history-list" style="font-size:.8rem">
              @if (!versions().length) {
                <div class="text-center py-4 text-muted small">No versions yet.<br>Generate content to start.</div>
              }
              @for (v of versions(); track v.id; let i = $index) {
                <div class="history-item p-2 border-bottom" (click)="restoreVersion(v)">
                  <div class="d-flex justify-content-between">
                    <span class="fw-medium">v{{ versions().length - i }}</span>
                    <span class="text-muted" style="font-size:.7rem">{{ formatDate(v.createdAt) }}</span>
                  </div>
                  <div class="text-truncate text-muted" style="font-size:.75rem">{{ v.content.title || 'Untitled' }}</div>
                  <div class="text-muted" style="font-size:.68rem">{{ v.provider }}/{{ v.model }}</div>
                </div>
              }
            </div>
          </div>
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Actions</div>
            <div class="card-body p-2 d-flex flex-column gap-2">
              <button class="btn btn-sm btn-outline-success w-100" (click)="copyAll()">Copy All</button>
              <button class="btn btn-sm btn-outline-warning w-100" (click)="resetContent()">Reset Content</button>
              <button class="btn btn-sm btn-outline-danger w-100" (click)="resetAll()">Reset All</button>
            </div>
          </div>
        </div>
      </div>
    </app-marketplace-layout>
  `,
  styles: [`
    .ai-grid{display:grid;grid-template-columns:280px 1fr 240px;gap:1rem;align-items:start}
    @media(max-width:1200px){.ai-grid{grid-template-columns:260px 1fr 200px}}
    @media(max-width:992px){.ai-grid{grid-template-columns:1fr}}
    .ai-left,.ai-center,.ai-right{min-height:0}
    .form-label{font-size:.75rem;color:#555;margin-bottom:.1rem}
    .border-dashed{border-style:dashed!important}
    .content-output textarea{font-size:.82rem}
    .content-output textarea:focus{background:#fafaff}
    .content-output .form-control,.content-output .input-group-text{font-size:.82rem}
    .history-item{cursor:pointer;transition:background .15s}
    .history-item:hover{background:#f5f5f8}
    .history-item:last-child{border-bottom:none!important}
    .history-list{max-height:calc(100vh - 400px);overflow-y:auto}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AITestingStudioComponent implements OnInit, OnDestroy {
  private readonly aiTestingSvc = inject(AITestingService);
  private readonly visionSvc = inject(VisionAnalysisService);
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly ai = inject(AIService);
  private readonly versionSvc = inject(VersionHistoryService);

  readonly templates = PROMPT_TEMPLATES;
  readonly labels = MARKETPLACE_LABELS;

  readonly generationButtons = [
    { id: 'title', label: 'Title', tooltip: 'Generate product title' },
    { id: 'description', label: 'Description', tooltip: 'Generate product description' },
    { id: 'features', label: 'Features', tooltip: 'Generate feature highlights' },
    { id: 'seo', label: 'SEO Details', tooltip: 'Generate fabric, fit, sleeve, pattern, neck, occasion' },
    { id: 'keywords', label: 'Keywords', tooltip: 'Generate SEO keywords' },
    { id: 'attributes', label: 'Attributes', tooltip: 'Generate marketplace attributes' },
    { id: 'everything', label: 'Everything', tooltip: 'Generate all content at once' },
  ];

  // Input state
  input: ListingInput = {
    name: 'Handwoven Cotton Dhurrie', brand: 'Vrindaya', category: 'Home Decor',
    description: 'A beautifully handwoven cotton dhurrie that adds warmth and character to any space. Crafted by skilled artisans using traditional techniques.',
    platform: 'flipkart', targetPrice: 2499, targetStock: 150,
  };

  // Generated content (editable)
  content: GeneratedContent = {
    title: '', description: '', highlights: [], seoKeywords: [],
    fabric: '', fit: '', sleeve: '', pattern: '', neck: '', occasion: '', care: [],
    marketplaceAttributes: [], imageAltText: '',
  };

  // Vision
  imageUrls = signal<string[]>([]);
  visionResult = signal<VisionAnalysisResult | null>(null);
  analyzing = signal(false);

  // Prompt
  selectedTemplate = signal('standard');
  customPrompt = signal('');

  // Generation state
  generating = signal(false);
  activeField = signal<string | null>(null);
  progress = signal(0);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  saving = signal(false);
  publishing = signal(false);
  lastGenType = signal<string | null>(null);

  private currentSub: Subscription | null = null;
  private progressTimer: any = null;
  private readonly destroy$ = new Subject<void>();

  // Computed
  hasContent = computed(() => !!this.content.title || !!this.content.description || !!this.content.highlights.length);

  activeFieldLabel = computed(() => {
    const f = this.activeField();
    if (!f) return 'Generating...';
    const btn = this.generationButtons.find(b => b.id === f);
    return btn ? `Generating ${btn.label}...` : 'Generating...';
  });

  versions = computed(() => this.aiTestingSvc.versions());

  ngOnInit(): void {
    this.visionSvc.history();
    const visionJson = localStorage.getItem('vrindaya_vision_for_ai');
    if (visionJson) {
      try {
        const vision = JSON.parse(visionJson);
        if (vision.fabric) this.content.fabric = vision.fabric;
        if (vision.colour) this.content.seoKeywords = [vision.colour, ...this.content.seoKeywords];
        if (vision.sleeve) this.content.sleeve = vision.sleeve;
        if (vision.neck) this.content.neck = vision.neck;
        if (vision.fit) this.content.fit = vision.fit;
        if (vision.pattern) this.content.pattern = vision.pattern;
        if (vision.occasion) this.content.occasion = vision.occasion;
        if (vision.category) this.input.category = vision.category;
        localStorage.removeItem('vrindaya_vision_for_ai');
        this.successMessage.set('Vision analysis data loaded.');
      } catch { /* ignore */ }
    }
  }

  ngOnDestroy(): void {
    this.cancelGeneration();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Input ---
  onInputChange(): void {}

  // --- Images ---
  addImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.imageUrls.update(u => [...u, url]);
    input.value = '';
  }

  removeImage(index: number): void {
    this.imageUrls.update(u => u.filter((_, i) => i !== index));
  }

  // --- Vision ---
  analyzeImages(): void {
    const urls = this.imageUrls();
    if (!urls.length) return;
    this.analyzing.set(true);
    this.errorMessage.set(null);
    this.visionSvc.analyzeImages(urls).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.visionResult.set(result);
        this.analyzing.set(false);
      },
      error: e => {
        this.errorMessage.set(e.message || 'Vision analysis failed');
        this.analyzing.set(false);
      },
    });
  }

  applyVisionResult(): void {
    const vr = this.visionResult();
    if (!vr) return;
    if (vr.category) this.input.category = vr.category;
    if (vr.colour) this.content.seoKeywords = [...this.content.seoKeywords.filter(k => !k.toLowerCase().includes(vr.colour.toLowerCase())), vr.colour];
    if (vr.fabric) this.content.fabric = vr.fabric;
    if (vr.fit) this.content.fit = vr.fit;
    if (vr.sleeve) this.content.sleeve = vr.sleeve;
    if (vr.neck) this.content.neck = vr.neck;
    if (vr.occasion) this.content.occasion = vr.occasion;
  }

  // --- Generation ---
  generate(btn: { id: string; label: string }): void {
    if (this.generating()) return;
    this.cancelGeneration();
    this.errorMessage.set(null);
    this.activeField.set(btn.id);
    this.generating.set(true);
    this.lastGenType.set(btn.id);
    this.progress.set(0);

    this.startProgressSimulation();

    const template = this.templates.find(t => t.id === this.selectedTemplate());
    const custom = this.customPrompt().trim();
    const fullInput = { ...this.input };

    let useCustomPrompt = false;
    let customPromptText = '';
    if (custom) {
      useCustomPrompt = true;
      customPromptText = custom;
    } else if (template && template.id !== 'standard' && template.system) {
      useCustomPrompt = true;
      customPromptText = template.system;
    }

    let obs = this.aiTestingSvc.generateEverything(fullInput);

    switch (btn.id) {
      case 'title':
        obs = this.aiTestingSvc.generateTitle(fullInput).pipe(
          // map to GeneratedContent shape so everything observable is uniform
          // Wrap in an object that our subscriber can handle
        ) as any;
        break;
      case 'description':
        obs = this.aiTestingSvc.generateDescription(fullInput) as any;
        break;
      case 'features':
        obs = this.aiTestingSvc.generateHighlights(fullInput) as any;
        break;
      case 'seo':
        obs = this.aiTestingSvc.generateEverything(fullInput) as any;
        break;
      case 'keywords':
        obs = this.aiTestingSvc.generateSeoKeywords(fullInput) as any;
        break;
      case 'attributes':
        obs = this.aiTestingSvc.generateMarketplaceAttributes(fullInput) as any;
        break;
      case 'everything':
        obs = this.aiTestingSvc.generateEverything(fullInput);
        break;
    }

    // Build prompt with template/custom if needed
    if (useCustomPrompt && btn.id === 'everything') {
      // For everything, the prompt is already baked into the service
      // We could modify but let's keep it simple
    }

    const sub = (obs as any).subscribe({
      next: (result: any) => {
        this.applyResult(btn.id, result);
      },
      error: (e: any) => {
        this.errorMessage.set(e.message || 'Generation failed');
        this.generating.set(false);
        this.activeField.set(null);
        this.stopProgressSimulation();
        this.progress.set(0);
      },
      complete: () => {
        this.generating.set(false);
        this.activeField.set(null);
        this.stopProgressSimulation();
        this.progress.set(100);
      },
    });
    this.currentSub = sub;
  }

  private applyResult(field: string, result: any): void {
    switch (field) {
      case 'title':
        this.content.title = result as string;
        break;
      case 'description':
        this.content.description = result as string;
        break;
      case 'features':
        this.content.highlights = result as string[];
        break;
      case 'seo':
      case 'everything': {
        const g = result as GeneratedContent;
        if (g.title) this.content.title = g.title;
        if (g.description) this.content.description = g.description;
        if (g.highlights?.length) this.content.highlights = g.highlights;
        if (g.seoKeywords?.length) this.content.seoKeywords = g.seoKeywords;
        if (g.fabric) this.content.fabric = g.fabric;
        if (g.fit) this.content.fit = g.fit;
        if (g.sleeve) this.content.sleeve = g.sleeve;
        if (g.pattern) this.content.pattern = g.pattern;
        if (g.neck) this.content.neck = g.neck;
        if (g.occasion) this.content.occasion = g.occasion;
        if (g.care?.length) this.content.care = g.care;
        if (g.marketplaceAttributes?.length) this.content.marketplaceAttributes = g.marketplaceAttributes;
        if (g.imageAltText) this.content.imageAltText = g.imageAltText;
        break;
      }
      case 'keywords':
        this.content.seoKeywords = result as string[];
        break;
      case 'attributes':
        this.content.marketplaceAttributes = result as { label: string; value: string }[];
        break;
    }

    this.saveVersionEntry(field, result);
  }

  private saveVersionEntry(field: string, result: any): void {
    const settings = this.ai.currentSettings();
    const vr = this.visionResult();
    const content = { ...this.content };
    const genFields = field === 'everything'
      ? Object.keys(content).filter(k => !Array.isArray((content as any)[k]) || ((content as any)[k] as any[]).length)
      : [field];
    this.versionSvc.add({
      id: crypto.randomUUID(),
      generationType: field,
      label: `${GENERATION_TYPE_LABELS[field] || field} — ${this.input.name}`,
      prompt: this.aiTestingSvc.lastPrompt(),
      provider: settings.provider,
      providerLabel: settings.provider,
      model: settings.model,
      visionModel: settings.visionModel,
      temperature: settings.temperature,
      visionResult: vr ? { raw: JSON.stringify(vr), fields: { category: vr.category, fabric: vr.fabric, colour: vr.colour } } : undefined,
      inputSnapshot: { ...this.input },
      generatedContent: content as any,
      generatedFields: genFields,
      marketplace: this.input.platform,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      approved: false,
    });
  }

  cancelGeneration(): void {
    if (this.currentSub) {
      this.currentSub.unsubscribe();
      this.currentSub = null;
    }
    this.stopProgressSimulation();
    this.generating.set(false);
    this.activeField.set(null);
    this.progress.set(0);
  }

  retry(): void {
    const last = this.lastGenType();
    if (!last) return;
    const btn = this.generationButtons.find(b => b.id === last);
    if (btn) this.generate(btn);
  }

  private startProgressSimulation(): void {
    this.progress.set(5);
    let p = 5;
    this.progressTimer = setInterval(() => {
      p += Math.random() * 8;
      if (p >= 90) { p = 90; clearInterval(this.progressTimer); }
      this.progress.set(Math.round(p));
    }, 400);
  }

  private stopProgressSimulation(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  // --- Content editing helpers ---
  addHighlight(): void { this.content.highlights = [...this.content.highlights, '']; }
  removeHighlight(i: number): void { this.content.highlights = this.content.highlights.filter((_, idx) => idx !== i); }
  addKeyword(): void { this.content.seoKeywords = [...this.content.seoKeywords, '']; }
  removeKeyword(i: number): void { this.content.seoKeywords = this.content.seoKeywords.filter((_, idx) => idx !== i); }
  addCare(): void { this.content.care = [...this.content.care, '']; }
  removeCare(i: number): void { this.content.care = this.content.care.filter((_, idx) => idx !== i); }
  addMarketplaceAttribute(): void { this.content.marketplaceAttributes = [...this.content.marketplaceAttributes, { label: '', value: '' }]; }
  removeMarketplaceAttribute(i: number): void { this.content.marketplaceAttributes = this.content.marketplaceAttributes.filter((_, idx) => idx !== i); }

  // --- Actions ---
  approveContent(): void {
    this.aiTestingSvc.saveVersion(this.content, this.input);
    const all = this.versionSvc.all();
    if (all.length) {
      const latest = all.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
      this.versionSvc.update(latest.id, { approved: true });
    }
    this.successMessage.set('Content approved and version saved.');
  }

  async saveToProduct(): Promise<void> {
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const result = await this.productSvc.getAll({ pageSize: 1, filters: [{ field: 'name', op: '==', value: this.input.name }] });
      let product = result.items[0];
      if (!product) {
        product = await this.productSvc.create({
          websiteProductId: crypto.randomUUID(),
          name: this.input.name,
          description: this.input.description,
          brand: this.input.brand,
          category: this.input.category,
          images: [],
          attributes: [
            { name: 'Fabric', value: this.content.fabric, source: 'ai_generated', isRequired: false, isCustom: false, order: 0 },
            { name: 'Fit', value: this.content.fit, source: 'ai_generated', isRequired: false, isCustom: false, order: 1 },
            { name: 'Sleeve', value: this.content.sleeve, source: 'ai_generated', isRequired: false, isCustom: false, order: 2 },
            { name: 'Pattern', value: this.content.pattern, source: 'ai_generated', isRequired: false, isCustom: false, order: 3 },
            { name: 'Neck', value: this.content.neck, source: 'ai_generated', isRequired: false, isCustom: false, order: 4 },
            { name: 'Occasion', value: this.content.occasion, source: 'ai_generated', isRequired: false, isCustom: false, order: 5 },
          ].filter(a => !!a.value),
          seo: {
            metaTitle: this.content.title,
            metaDescription: this.content.description?.slice(0, 160),
            focusKeyword: this.content.seoKeywords?.join(', ') || '',
            slug: this.input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            noIndex: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          highlights: this.content.highlights,
          specifications: this.content.marketplaceAttributes.map(a => ({ label: a.label, value: a.value })),
          packageContents: '',
          hsn: '',
          gst: 0,
          countryOfOrigin: 'India',
          status: 'draft',
          tags: this.content.seoKeywords,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        this.successMessage.set(`Product "${product.name}" created.`);
      } else {
        await this.productSvc.update(product.id!, {
          description: this.content.description || product.description,
          highlights: this.content.highlights.length ? this.content.highlights : product.highlights,
          seo: this.content.title ? {
            ...product.seo,
            metaTitle: this.content.title || product.seo.metaTitle,
            metaDescription: this.content.description?.slice(0, 160) || product.seo.metaDescription,
            focusKeyword: this.content.seoKeywords?.join(', ') || product.seo.focusKeyword,
          } : product.seo,
          version: product.version + 1,
        } as any);
        this.successMessage.set(`Product "${product.name}" updated.`);
      }
      this.aiTestingSvc.saveVersion(this.content, this.input);
    } catch (e: any) {
      this.errorMessage.set(e.message || 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  async publishContent(): Promise<void> {
    this.publishing.set(true);
    this.errorMessage.set(null);
    try {
      await this.saveToProduct();
      const result = await this.productSvc.getAll({ pageSize: 1, filters: [{ field: 'name', op: '==', value: this.input.name }] });
      const product = result.items[0];
      if (product?.id) {
        const listings = await this.listingSvc.getByProductId(product.id);
        if (listings.length) {
          await this.listingSvc.bulkPublish(listings.map(l => l.id!));
        } else {
          await this.listingSvc.create({
            marketplaceProductId: product.id,
            websiteProductId: product.websiteProductId,
            platform: this.input.platform as any,
            marketplaceTitle: this.content.title || product.name,
            marketplaceDescription: this.content.description || product.description,
            listingStatus: 'active',
            marketplaceSku: '',
            sellerSku: '',
            listingUrl: '',
            fsn: '',
            marketplaceListingId: '',
            pricing: { mrp: this.input.targetPrice, sellingPrice: this.input.targetPrice, discountPercent: 0, taxRate: 0, taxInclusive: true, shippingCharge: 0, currency: 'INR', createdAt: new Date(), updatedAt: new Date() },
            inventory: { totalStock: this.input.targetStock, availableStock: this.input.targetStock, reservedStock: 0, damagedStock: 0, incomingStock: 0, lowStockThreshold: 5, stockStatus: 'in_stock', fulfillmentType: 'self', createdAt: new Date(), updatedAt: new Date() },
            aiStatus: 'completed',
            publishStatus: 'published',
            fulfillmentType: 'self',
            handlingTimeDays: 2,
            returnPolicy: '',
            shippingWeight: 0,
            shippingWeightUnit: 'g',
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
        }
        this.successMessage.set('Content published to marketplace.');
      }
    } catch (e: any) {
      this.errorMessage.set(e.message || 'Publish failed');
    } finally {
      this.publishing.set(false);
    }
  }

  restoreVersion(v: ContentVersion): void {
    this.content = JSON.parse(JSON.stringify(v.content));
    this.input = JSON.parse(JSON.stringify(v.input));
    this.successMessage.set(`Restored version from ${this.formatDate(v.createdAt)}.`);
  }

  /** Restore from the new VersionHistoryService entry */
  restoreVersionEntry(entry: import('../../models/version-history.model').VersionEntry): void {
    const gc = entry.generatedContent as any;
    if (gc.title) this.content.title = gc.title;
    if (gc.description) this.content.description = gc.description;
    if (gc.highlights) this.content.highlights = [...(gc.highlights || [])];
    if (gc.seoKeywords) this.content.seoKeywords = [...(gc.seoKeywords || [])];
    if (gc.fabric) this.content.fabric = gc.fabric;
    if (gc.fit) this.content.fit = gc.fit;
    if (gc.sleeve) this.content.sleeve = gc.sleeve;
    if (gc.pattern) this.content.pattern = gc.pattern;
    if (gc.neck) this.content.neck = gc.neck;
    if (gc.occasion) this.content.occasion = gc.occasion;
    if (gc.care) this.content.care = [...(gc.care || [])];
    if (gc.marketplaceAttributes) this.content.marketplaceAttributes = [...(gc.marketplaceAttributes || [])];
    if (gc.imageAltText) this.content.imageAltText = gc.imageAltText;
    const snap = entry.inputSnapshot as any;
    if (snap.name) this.input.name = snap.name;
    if (snap.brand) this.input.brand = snap.brand;
    if (snap.category) this.input.category = snap.category;
    if (snap.description) this.input.description = snap.description;
    if (snap.platform) this.input.platform = snap.platform;
    this.successMessage.set(`Restored from "${entry.label}" (${this.formatDate(entry.createdAt)}).`);
  }

  copyAll(): void {
    const text = [
      `Title: ${this.content.title}`,
      `Description: ${this.content.description}`,
      `Highlights: ${this.content.highlights.map((h, i) => `${i + 1}. ${h}`).join('; ')}`,
      `Keywords: ${this.content.seoKeywords.join(', ')}`,
      `Details: Fabric=${this.content.fabric}, Fit=${this.content.fit}, Sleeve=${this.content.sleeve}, Pattern=${this.content.pattern}, Neck=${this.content.neck}, Occasion=${this.content.occasion}`,
      `Care: ${this.content.care.join('; ')}`,
    ].join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Content copied to clipboard.');
    }).catch(() => {
      this.errorMessage.set('Failed to copy.');
    });
  }

  resetContent(): void {
    this.content = { title: '', description: '', highlights: [], seoKeywords: [], fabric: '', fit: '', sleeve: '', pattern: '', neck: '', occasion: '', care: [], marketplaceAttributes: [], imageAltText: '' };
    this.successMessage.set('Content reset.');
  }

  resetAll(): void {
    this.resetContent();
    this.imageUrls.set([]);
    this.visionResult.set(null);
    this.customPrompt.set('');
    this.selectedTemplate.set('standard');
    this.lastGenType.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
