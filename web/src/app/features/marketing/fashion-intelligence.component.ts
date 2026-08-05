import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { FashionIntelligenceService } from './fashion-intelligence.service';
import {
  CLASSIFICATION_KEYS,
  OCCASIONS,
  SEASONS,
  AUDIENCES,
  FABRIC_STYLES,
  PRINT_TYPES,
  COLOR_FAMILIES,
  ProductInput,
  ClassificationResult,
} from './models/fashion-intelligence.model';

@Component({
  selector: 'app-fashion-intelligence',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="fi-page">
      <div class="fi-header">
        <div>
          <h1 class="fi-title"><i class="bi bi-brain"></i> Fashion Intelligence</h1>
          <p class="fi-desc">Automatically classify products across 10 dimensions — occasion, season, audience, fabric, print, color, and scoring metrics.</p>
        </div>
        <div class="fi-actions">
          <button class="btn btn-outline-secondary fi-btn" (click)="clearHistory()" [disabled]="history().length === 0">
            <i class="bi bi-trash3"></i> Clear History
          </button>
        </div>
      </div>

      <div class="fi-layout">
        <div class="fi-form-panel">
          <div class="fi-card">
            <div class="fi-card-head">
              <h2 class="fi-card-title"><i class="bi bi-tag"></i> Product Details</h2>
            </div>
            <form (ngSubmit)="onClassify()" #productForm="ngForm">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label fi-label"><i class="bi bi-tag"></i> Product Name</label>
                  <input type="text" class="form-control fi-input" [(ngModel)]="product.name" name="name" placeholder="e.g. Crimson Banarasi Silk Saree" required>
                </div>
                <div class="col-12">
                  <label class="form-label fi-label"><i class="bi bi-grid"></i> Category</label>
                  <select class="form-select fi-input" [(ngModel)]="product.category" name="category" required>
                    <option value="Sarees">Sarees</option>
                    <option value="Lehengas">Lehengas</option>
                    <option value="Kurtas">Kurtas</option>
                    <option value="Suits">Suits</option>
                    <option value="Dupattas">Dupattas</option>
                    <option value="Blouses">Blouses</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label fi-label"><i class="bi bi-card-text"></i> Description</label>
                  <textarea class="form-control fi-input" [(ngModel)]="product.description" name="description" rows="3" placeholder="Describe the product — fabric, embellishments, style, occasion..."></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label fi-label"><i class="bi bi-currency-rupee"></i> Price (₹)</label>
                  <input type="number" class="form-control fi-input" [(ngModel)]="product.price" name="price" placeholder="25000" min="0" step="100">
                </div>
                <div class="col-md-6">
                  <label class="form-label fi-label"><i class="bi bi-tags"></i> Tags (comma-separated)</label>
                  <input type="text" class="form-control fi-input" [(ngModel)]="tagsInput" name="tagsInput" placeholder="bridal, silk, zari, handwoven, festive">
                </div>
              </div>
              <div class="fi-form-actions">
                <button type="submit" class="btn fi-btn-primary" [disabled]="loading() || !productForm.form.valid">
                  @if (loading()) {
                    <span class="fi-spinner"></span> Analyzing...
                  } @else {
                    <i class="bi bi-magic"></i> Classify Product
                  }
                </button>
                <button type="button" class="btn btn-outline-secondary fi-btn" (click)="resetForm()">
                  <i class="bi bi-arrow-counterclockwise"></i> Reset
                </button>
              </div>
            </form>
          </div>

          @if (result()) {
            <div class="fi-card fi-summary">
              <div class="fi-card-head">
                <h2 class="fi-card-title"><i class="bi bi-check-circle"></i> Classification Summary</h2>
              </div>
              <div class="fi-summary-grid">
                @for (r of labelResults(); track r.key) {
                  <div class="fi-summary-item">
                    <div class="fi-summary-icon"><i class="bi {{ r.icon }}"></i></div>
                    <div class="fi-summary-info">
                      <span class="fi-summary-label">{{ r.label }}</span>
                      <strong class="fi-summary-value">{{ r.value }}</strong>
                    </div>
                    <div class="fi-summary-conf">{{ r.confidence }}%</div>
                  </div>
                }
              </div>
              <div class="fi-score-bar">
                @for (r of scoreResults(); track r.key) {
                  <div class="fi-score-item">
                    <div class="fi-score-head">
                      <span class="fi-score-label"><i class="bi {{ r.icon }}"></i> {{ r.label }}</span>
                      <span class="fi-score-value">{{ r.value }}</span>
                    </div>
                    <div class="fi-score-track">
                      <div class="fi-score-fill" [style.width.%]="r.score" [class]="scoreClass(r.score)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <div class="fi-detail-panel">
          @if (result()) {
            <div class="fi-card fi-details">
              <div class="fi-card-head">
                <h2 class="fi-card-title"><i class="bi bi-list-ul"></i> Detailed Analysis</h2>
              </div>
              <div class="fi-details-list">
                @for (r of result()!; track r.key) {
                  <div class="fi-detail-item">
                    <div class="fi-detail-header">
                      <div class="fi-detail-icon"><i class="bi {{ r.icon }}"></i></div>
                      <div class="fi-detail-meta">
                        <strong class="fi-detail-label">{{ r.label }}</strong>
                        <span class="fi-detail-value">{{ r.value }}</span>
                        <span class="fi-detail-conf">{{ r.confidence }}% confidence</span>
                      </div>
                    </div>
                    <p class="fi-detail-reason"><i class="bi bi-lightbulb"></i> {{ r.reasoning }}</p>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="fi-card fi-placeholder">
              <i class="bi bi-brain"></i>
              <h3>Awaiting product input</h3>
              <p>Enter product details and click "Classify Product" to get AI-powered classification across 10 fashion dimensions.</p>
            </div>
          }

          @if (history().length > 0) {
            <div class="fi-card fi-history">
              <div class="fi-card-head">
                <h2 class="fi-card-title"><i class="bi bi-clock-history"></i> Recent Classifications</h2>
              </div>
              <div class="fi-history-list">
                @for (h of history(); track h.classifiedAt; let i = $index) {
                  <button class="fi-history-item" (click)="loadHistory(h)">
                    <div class="fi-hinfo">
                      <strong>{{ h.product.name }}</strong>
                      <span>{{ h.product.category }} · {{ h.product.price | number }}₹</span>
                    </div>
                    <div class="fi-hscores">
                      <span class="fi-hscore" [class]="scoreClass(h.results.find(r => r.key === 'trendingScore')?.score || 0)">{{ h.results.find(r => r.key === 'trendingScore')?.value }}</span>
                      <span class="fi-hscore" [class]="scoreClass(h.results.find(r => r.key === 'luxuryScore')?.score || 0)">{{ h.results.find(r => r.key === 'luxuryScore')?.value }}</span>
                    </div>
                    <i class="bi bi-chevron-right"></i>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './fashion-intelligence.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FashionIntelligenceComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(FashionIntelligenceService);

  readonly history = computed(() => this.service.history());

  product: ProductInput = { name: '', category: 'Sarees', description: '', price: 0, tags: [] };
  tagsInput = '';
  loading = signal(false);
  result = signal<ClassificationResult[] | null>(null);

  readonly labelResults = computed(() => this.result()?.filter(r => CLASSIFICATION_KEYS.find(k => k.key === r.key)?.type === 'label') ?? []);
  readonly scoreResults = computed(() => this.result()?.filter(r => CLASSIFICATION_KEYS.find(k => k.key === r.key)?.type === 'score') ?? []);

  scoreClass(score: number): string {
    if (score >= 75) return 'fi-score-high';
    if (score >= 50) return 'fi-score-medium';
    return 'fi-score-low';
  }

  onClassify(): void {
    if (this.loading() || !this.product.name.trim()) return;
    this.product.tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    this.loading.set(true);
    setTimeout(() => {
      this.result.set(this.service.classify({ ...this.product }));
      this.loading.set(false);
      this.toast.success('Product classified across 10 dimensions');
    }, 700);
  }

  loadHistory(h: { product: ProductInput; results: ClassificationResult[] }): void {
    this.product = { ...h.product };
    this.tagsInput = h.product.tags.join(', ');
    this.result.set(h.results);
    this.toast.info('Loaded previous classification');
  }

  resetForm(): void {
    this.product = this.service.getDefaultProduct();
    this.tagsInput = '';
    this.result.set(null);
  }

  clearHistory(): void {
    if (confirm('Clear classification history?')) {
      this.service.clearHistory();
      this.toast.info('History cleared');
    }
  }
}