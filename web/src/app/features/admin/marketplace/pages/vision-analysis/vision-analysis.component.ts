import { Component, signal, computed, inject, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { VisionAnalysisService } from '../../services/vision-analysis.service';
import type { VisionAnalysisResult } from '../../models/vision-analysis.model';

interface FieldDef { key: keyof VisionAnalysisResult; label: string; type: 'text' | 'score' }

const FIELDS: FieldDef[] = [
  { key: 'fabric', label: 'Fabric', type: 'text' },
  { key: 'print', label: 'Print', type: 'text' },
  { key: 'embroidery', label: 'Embroidery', type: 'text' },
  { key: 'sleeve', label: 'Sleeves', type: 'text' },
  { key: 'neck', label: 'Neck', type: 'text' },
  { key: 'length', label: 'Length', type: 'text' },
  { key: 'colour', label: 'Colour', type: 'text' },
  { key: 'buttons', label: 'Buttons', type: 'text' },
  { key: 'mirrorWork', label: 'Mirror Work', type: 'text' },
  { key: 'lace', label: 'Lace', type: 'text' },
  { key: 'pockets', label: 'Pockets', type: 'text' },
  { key: 'bottom', label: 'Bottom', type: 'text' },
  { key: 'dupatta', label: 'Dupatta', type: 'text' },
  { key: 'occasion', label: 'Occasion', type: 'text' },
  { key: 'season', label: 'Season', type: 'text' },
  { key: 'fit', label: 'Fit', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
];

@Component({
  selector: 'app-vision-analysis',
  standalone: true,
  imports: [CommonModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Vision Analysis" subtitle="Analyze product images with AI vision.">
      <div actions class="d-flex gap-2">
        @if (approvedCount()) {
          <span class="badge bg-success bg-opacity-10 text-success px-3 py-2">{{ approvedCount() }} approved</span>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <div class="va-grid">
        <div class="va-left">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Upload Images</div>
            <div class="card-body p-2">
              <div class="upload-area" (click)="fileInput.click()" [class.has-images]="previews().length > 0" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                @if (previews().length === 0) {
                  <div class="upload-placeholder">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    <p class="small text-muted mt-2 mb-0">Click or drag images here</p>
                  </div>
                } @else {
                  <div class="d-flex flex-wrap gap-2">
                    @for (src of previews(); track src; let i = $index) {
                      <div class="position-relative" style="width:72px;height:72px">
                        <img [src]="src" alt="" class="rounded border" style="width:100%;height:100%;object-fit:cover" referrerpolicy="no-referrer" />
                        <button class="position-absolute top-0 end-0 btn p-0 lh-1 bg-white rounded-circle shadow-sm" style="font-size:.65rem;width:18px;height:18px" (click)="removePreview(i);$event.stopPropagation()">&times;</button>
                      </div>
                    }
                  </div>
                }
              </div>
              <input #fileInput type="file" multiple accept="image/*" class="d-none" (change)="onFilesSelected($event)" />
            </div>
            <div class="card-footer bg-transparent border-0 pt-0 d-flex gap-2">
              <button class="btn btn-primary btn-sm flex-fill" (click)="analyze()" [disabled]="analyzing() || !previews().length">
                @if (analyzing()) { <span class="spinner-border spinner-border-sm me-1"></span> Analyzing... }
                @else { <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze }
              </button>
              @if (previews().length) {
                <button class="btn btn-sm btn-outline-secondary" (click)="clearUploads()">Clear</button>
              }
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span>History</span>
              <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ history().length }}</span>
            </div>
            <div class="card-body p-0" style="max-height:400px;overflow-y:auto">
              @if (!history().length) {
                <div class="text-center py-4 text-muted small">No analyses yet.</div>
              }
              @for (item of history(); track item.createdAt; let i = $index) {
                <div class="history-row p-2 border-bottom d-flex align-items-center gap-2" (click)="selectResult(item)" [class.active]="selectedResult() === item">
                  @if (item.imageUrls.length) {
                    <img [src]="item.imageUrls[0]" alt="" class="rounded" style="width:36px;height:36px;object-fit:cover" referrerpolicy="no-referrer" />
                  }
                  <div class="flex-fill min-width-0">
                    <div class="small fw-medium text-truncate">{{ item.category || 'Uncategorized' }}</div>
                    <div class="small text-muted">{{ item.fabric || '-' }} &middot; {{ item.colour || '-' }}</div>
                  </div>
                  <div class="text-end">
                    @if (item.approved) {
                      <span class="badge bg-success bg-opacity-10 text-success" style="font-size:.6rem">&#10003;</span>
                    }
                    <div class="small text-muted" style="font-size:.65rem">{{ formatDate(item.createdAt) }}</div>
                  </div>
                </div>
              }
            </div>
            @if (history().length) {
              <div class="card-footer bg-transparent border-0 pt-0">
                <button class="btn btn-sm btn-link text-decoration-none text-muted px-0" (click)="clearHistory()">Clear All</button>
              </div>
            }
          </div>
        </div>

        <div class="va-right">
          @if (currentResult(); as result) {
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2" style="font-size:.85rem">
                <span class="fw-semibold">Analysis Results</span>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge" [class]="confidenceBadge(result.confidenceScore)" style="font-size:.8rem">
                    {{ (result.confidenceScore * 100).toFixed(0) }}% Confidence
                  </span>
                  @if (result.approved) {
                    <span class="badge bg-success bg-opacity-10 text-success">Approved</span>
                  }
                </div>
              </div>
              <div class="card-body p-3">
                <div class="mb-3">
                  <div class="d-flex justify-content-between small mb-1">
                    <span class="text-muted fw-medium">Confidence Score</span>
                    <span class="fw-bold" [style.color]="confidenceColor(result.confidenceScore)">{{ (result.confidenceScore * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="progress" style="height:10px;border-radius:5px;background:#eee">
                    <div class="progress-bar" [style.width.%]="result.confidenceScore * 100" [style.background]="confidenceColor(result.confidenceScore)" style="border-radius:5px;transition:width .5s"></div>
                  </div>
                </div>
                <div class="row g-2">
                  @for (field of editableFields; track field.key) {
                    <div class="col-6 col-md-4 col-lg-3">
                      <label class="field-label">{{ field.label }}</label>
                      @if (field.key === 'confidenceScore') {
                        <div class="field-value d-flex align-items-center gap-2">
                          <div class="flex-fill progress" style="height:6px"><div class="progress-bar" [style.width.%]="percent(result, field.key)" [style.background]="confidenceColor(percent(result, field.key) / 100)"></div></div>
                          <span class="small fw-bold" style="min-width:35px;text-align:right">{{ percent(result, field.key).toFixed(0) }}%</span>
                        </div>
                      } @else {
                        <input class="form-control form-control-sm" style="font-size:.82rem" [value]="result[field.key]" (input)="onInput(field.key, $event)" />
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 flex-wrap">
              <button class="btn btn-sm btn-success" (click)="approveAnalysis()" [disabled]="result.approved">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="20 6 9 17 4 12"/></svg>
                {{ result.approved ? 'Approved' : 'Approve' }}
              </button>
              <button class="btn btn-sm btn-primary" (click)="storeAnalysis()" [disabled]="!result.approved || storing()">
                @if (storing()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                Store Approved Analysis
              </button>
              <button class="btn btn-sm btn-outline-info" (click)="generateContent()" [disabled]="!result.approved">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Generate Marketplace Content
              </button>
              <button class="btn btn-sm btn-outline-secondary" (click)="copyResult()">Copy</button>
            </div>
          } @else {
            <div class="card border-0 shadow-sm">
              <div class="card-body text-center py-5">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <p class="text-muted small mt-3 mb-0">Upload product images and click <strong>Analyze</strong> to get started.</p>
                <p class="text-muted small mb-0">Editable results let you refine before approving.</p>
              </div>
            </div>
          }
        </div>
      </div>
    </app-marketplace-layout>
  `,
  styles: [`
    .va-grid{display:grid;grid-template-columns:300px 1fr;gap:1rem;align-items:start}
    @media(max-width:992px){.va-grid{grid-template-columns:1fr}}
    .upload-area{border:2px dashed #ddd;border-radius:10px;padding:1rem;text-align:center;cursor:pointer;transition:border-color .2s;min-height:120px;display:flex;align-items:center;justify-content:center}
    .upload-area:hover{border-color:#aaa}
    .upload-area.has-images{border-color:#4a90d9}
    .upload-placeholder{display:flex;flex-direction:column;align-items:center}
    .history-row{cursor:pointer;transition:background .15s}
    .history-row:hover,.history-row.active{background:#f0f4ff}
    .field-label{display:block;font-size:.68rem;color:#888;text-transform:uppercase;letter-spacing:.03em;margin-bottom:.15rem;font-weight:600}
    .field-value{font-size:.88rem;color:#1a1a2e}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisionAnalysisComponent implements OnDestroy {
  private readonly visionSvc = inject(VisionAnalysisService);
  private readonly router = inject(Router);

  readonly editableFields = FIELDS;
  readonly history = this.visionSvc.history;
  readonly analyzing = this.visionSvc.analyzing;
  readonly error = this.visionSvc.error;

  previews = signal<string[]>([]);
  selectedResult = signal<VisionAnalysisResult | null>(null);
  currentResult = signal<VisionAnalysisResult | null>(null);
  successMessage = signal<string | null>(null);
  storing = signal(false);

  approvedCount = computed(() => this.history().filter(h => h.approved).length);

  private analysisSub: Subscription | null = null;

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.loadFiles(input.files);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) this.loadFiles(files);
  }

  private loadFiles(files: FileList): void {
    const readers: Promise<string>[] = [];
    for (let i = 0; i < Math.min(files.length, 8); i++) {
      readers.push(new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(files[i]);
      }));
    }
    Promise.all(readers).then(urls => {
      this.previews.set(urls);
      this.selectedResult.set(null);
      this.currentResult.set(null);
      this.visionSvc.error.set(null);
    });
  }

  removePreview(index: number): void {
    this.previews.update(p => p.filter((_, i) => i !== index));
    if (!this.previews().length) {
      this.currentResult.set(null);
    }
  }

  clearUploads(): void {
    this.previews.set([]);
    this.currentResult.set(null);
    this.selectedResult.set(null);
    this.visionSvc.error.set(null);
  }

  analyze(): void {
    const urls = this.previews();
    if (!urls.length) return;
    this.analysisSub?.unsubscribe();
    this.analysisSub = this.visionSvc.analyzeImages(urls).subscribe({
      next: r => {
        this.currentResult.set({ ...r });
        this.selectedResult.set(r);
      },
    });
  }

  selectResult(result: VisionAnalysisResult): void {
    this.selectedResult.set(result);
    this.currentResult.set({ ...result });
  }

  editField(key: keyof VisionAnalysisResult, value: string): void {
    const current = this.currentResult();
    if (!current) return;
    this.currentResult.set({ ...current, [key]: value as any });
  }

  onInput(key: keyof VisionAnalysisResult, event: Event): void {
    this.editField(key, (event.target as HTMLInputElement).value);
  }

  percent(result: VisionAnalysisResult, key: keyof VisionAnalysisResult): number {
    return (result[key] as number) * 100;
  }

  // --- Confidence helpers ---

  confidenceColor(score: number): string {
    if (score >= 0.8) return '#198754';
    if (score >= 0.5) return '#ffc107';
    return '#dc3545';
  }

  confidenceBadge(score: number): string {
    if (score >= 0.8) return 'bg-success bg-opacity-10 text-success';
    if (score >= 0.5) return 'bg-warning bg-opacity-10 text-warning';
    return 'bg-danger bg-opacity-10 text-danger';
  }

  // --- Actions ---

  approveAnalysis(): void {
    const result = this.currentResult();
    if (!result) return;
    const approved: VisionAnalysisResult = { ...result, approved: true, approvedAt: new Date().toISOString() };
    this.currentResult.set(approved);
    this.selectedResult.set(approved);
    this.visionSvc.history.update(h =>
      h.map(item => item.createdAt === result.createdAt ? approved : item)
    );
    this.successMessage.set('Analysis approved.');
  }

  async storeAnalysis(): Promise<void> {
    const result = this.currentResult();
    if (!result?.approved) return;
    this.storing.set(true);
    try {
      const { id: _i, productId: _p, rawResponse: _r, ...data } = result;
      localStorage.setItem('vrindaya_vision_approved', JSON.stringify(result));
      this.successMessage.set('Approved analysis stored successfully.');
    } catch {
      this.visionSvc.error.set('Failed to store analysis.');
    } finally {
      this.storing.set(false);
    }
  }

  generateContent(): void {
    const result = this.currentResult();
    if (!result?.approved) return;
    localStorage.setItem('vrindaya_vision_for_ai', JSON.stringify(result));
    this.router.navigate(['/admin', 'marketplace', 'ai-studio']);
  }

  copyResult(): void {
    const result = this.currentResult();
    if (!result) return;
    let text = FIELDS.filter(f => f.key !== 'confidenceScore')
      .map(f => `${f.label}: ${result[f.key] || '-'}`)
      .join('\n');
    text += `\nConfidence: ${(result.confidenceScore * 100).toFixed(0)}%`;
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Analysis copied to clipboard.');
    }).catch(() => {
      this.visionSvc.error.set('Failed to copy.');
    });
  }

  clearHistory(): void {
    this.visionSvc.clearHistory();
    this.selectedResult.set(null);
    this.currentResult.set(null);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.analysisSub?.unsubscribe();
  }
}
