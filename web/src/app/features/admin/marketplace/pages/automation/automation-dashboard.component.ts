import { Component, signal, computed, inject, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { AutomationEngineService } from '../../services/automation/automation-engine.service';
import { MARKETPLACE_WORKFLOWS } from '../../services/automation/models/automation-workflow.model';
import type { AutomationScreenshot } from '../../services/automation/models/automation-workflow.model';

@Component({
  selector: 'app-automation-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Browser Automation" subtitle="Automate marketplace listing creation with Playwright.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-primary" (click)="openModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Listing
        </button>
        @if (!activeTask()) {
          <button class="btn btn-sm btn-success" (click)="startQueue()" [disabled]="queuedCount() === 0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Queue
          </button>
        } @else {
          <button class="btn btn-sm btn-danger" (click)="cancelCurrent()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg> Cancel
          </button>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <div class="auto-grid">
        <!-- Queue & History -->
        <div class="auto-sidebar">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white py-2 fw-semibold d-flex justify-content-between" style="font-size:.85rem">
              <span>Queue</span>
              <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ queue().length }}</span>
            </div>
            <div class="list-group list-group-flush" style="max-height:300px;overflow-y:auto">
              @if (!queue().length) {
                <div class="list-group-item text-center text-muted small py-3">No queued tasks.</div>
              }
              @for (t of queue(); track t.id) {
                <div class="list-group-item px-3 py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <div class="small fw-medium">{{ platformLabel(t.platform) }}</div>
                    <div class="small text-muted" style="font-size:.7rem">{{ dateStr(t.createdAt) }}</div>
                  </div>
                  <div class="d-flex align-items-center gap-1">
                    <span class="badge" [class]="statusBadge(t.status)">{{ t.status }}</span>
                    @if (t.status === 'queued' || t.status === 'running') {
                      <button class="btn btn-sm btn-link text-danger p-0" style="font-size:.7rem" (click)="cancelTask(t.id!)">Cancel</button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white py-2 fw-semibold d-flex justify-content-between" style="font-size:.85rem">
              <span>History</span>
              <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ history().length }}</span>
            </div>
            <div class="list-group list-group-flush" style="max-height:300px;overflow-y:auto">
              @if (!history().length) {
                <div class="list-group-item text-center text-muted small py-3">No completed tasks.</div>
              }
              @for (h of history(); track h.taskId) {
                <div class="list-group-item px-3 py-2" (click)="viewHistory.set(h)" [class.active]="viewHistory() === h">
                  <div class="d-flex justify-content-between">
                    <span class="small fw-medium">{{ platformLabel(h.platform) }}</span>
                    <span class="badge" [class]="statusBadge(h.status)">{{ h.status }}</span>
                  </div>
                  <div class="small text-muted" style="font-size:.7rem">
                    {{ dateStr(h.startedAt) }} &middot; {{ h.elapsedSeconds }}s
                  </div>
                  @if (h.result) {
                    <div class="small text-success" style="font-size:.68rem">FSN: {{ h.result.fsn }}</div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Active / Detail Panel -->
        <div class="auto-main">
          @let active = activeTask();
          @let detail = viewHistory();
          @if (active) {
            <!-- Active Task -->
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
                <span class="fw-semibold">{{ platformLabel(active.platform) }} &mdash; {{ active.action }}</span>
                <div class="d-flex align-items-center gap-2">
                  <span class="small text-muted">{{ active.elapsedSeconds }}s / ~{{ active.estimatedSeconds }}s</span>
                  <div class="progress" style="width:100px;height:6px">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="progressPercent(active)"></div>
                  </div>
                </div>
              </div>
              <div class="card-body p-3">
                <div class="row g-2 mb-3">
                  @for (step of active.steps; track step.order) {
                    <div class="col-6 col-md-4 col-lg-3">
                      <div class="step-card" [class]="stepStatusClass(step.status)">
                        <div class="step-icon">
                          @if (step.status === 'completed') { <span class="text-success">&#10003;</span> }
                          @else if (step.status === 'running') { <span class="spinner-border spinner-border-sm text-primary"></span> }
                          @else if (step.status === 'failed') { <span class="text-danger">&#10007;</span> }
                          @else if (step.status === 'skipped') { <span class="text-muted">&ndash;</span> }
                          @else { <span class="text-muted" style="opacity:.4">{{ step.order + 1 }}</span> }
                        </div>
                        <div class="step-name">{{ step.name }}</div>
                        <div class="step-desc">{{ step.description }}</div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Result -->
                @if (active.result) {
                  <div class="alert alert-success py-2 small mb-3">
                    <div class="fw-semibold">Listing Published Successfully</div>
                    <div class="d-flex gap-3 flex-wrap mt-1">
                      <span>URL: <a [href]="active.result.listingUrl" target="_blank" class="text-decoration-none">{{ active.result.listingUrl }}</a></span>
                      <span>ID: <code>{{ active.result.marketplaceId }}</code></span>
                      <span>FSN: <code>{{ active.result.fsn }}</code></span>
                    </div>
                  </div>
                }
                @if (active.error) {
                  <div class="alert alert-danger py-2 small mb-3">{{ active.error }}</div>
                }

                <!-- Screenshots -->
                @if (active.screenshots.length) {
                  <div class="mb-3">
                    <div class="small fw-semibold text-muted mb-2">Screenshots ({{ active.screenshots.length }})</div>
                    <div class="d-flex gap-2 overflow-auto" style="padding-bottom:4px">
                      @for (ss of active.screenshots; track ss.id) {
                        <div class="screenshot-thumb" (click)="previewScreenshot.set(ss)">
                          <img [src]="ss.dataUrl" alt="" loading="lazy" />
                          <div class="small text-muted text-truncate" style="font-size:.65rem;max-width:120px">{{ ss.label }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Logs -->
                <div>
                  <div class="small fw-semibold text-muted mb-1">Execution Logs ({{ active.logs.length }})</div>
                  <div class="log-container">
                    @for (log of active.logs; track log.id) {
                      <div class="log-line" [class]="'log-' + log.level">
                        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                        <span class="log-level">[{{ log.level }}]</span>
                        @if (log.step) { <span class="log-step">{{ log.step }}:</span> }
                        <span class="log-msg">{{ log.message }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          } @else if (detail) {
            <!-- History Detail -->
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
                <span class="fw-semibold">{{ platformLabel(detail.platform) }} &mdash; {{ dateStr(detail.startedAt) }}</span>
                <span class="badge" [class]="statusBadge(detail.status)">{{ detail.status }}</span>
              </div>
              <div class="card-body p-3">
                @if (detail.result) {
                  <div class="mb-3">
                    <div class="fw-semibold small text-muted">Listing Result</div>
                    <div class="d-flex gap-3 flex-wrap mt-1 small">
                      <span>URL: <a [href]="detail.result.listingUrl" target="_blank">{{ detail.result.listingUrl }}</a></span>
                      <span>ID: <code>{{ detail.result.marketplaceId }}</code></span>
                      <span>FSN: <code>{{ detail.result.fsn }}</code></span>
                    </div>
                  </div>
                }
                @if (detail.error) {
                  <div class="alert alert-danger py-2 small mb-3">{{ detail.error }}</div>
                }
                <div class="small fw-semibold text-muted mb-1">Logs ({{ detail.logs.length }})</div>
                <div class="log-container" style="max-height:400px">
                  @for (log of detail.logs; track log.id) {
                    <div class="log-line" [class]="'log-' + log.level">
                      <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                      <span class="log-level">[{{ log.level }}]</span>
                      @if (log.step) { <span class="log-step">{{ log.step }}:</span> }
                      <span class="log-msg">{{ log.message }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="card border-0 shadow-sm">
              <div class="card-body text-center py-5">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                <p class="text-muted small mt-3 mb-0">No active automation task.</p>
                <p class="text-muted small mb-0">Click <strong>New Listing</strong> to create a task, then <strong>Start Queue</strong> to begin execution.</p>
              </div>
            </div>
          }
        </div>
      </div>
    </app-marketplace-layout>

    <!-- Create Task Modal -->
    @if (showModal()) {
      <div class="modal-backdrop fade show" (click)="closeModal()"></div>
      <div class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-white border-0">
              <h6 class="modal-title fw-semibold">New Marketplace Listing</h6>
              <button class="btn-close" (click)="closeModal()"></button>
            </div>
            <div class="modal-body p-3">
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label small fw-medium text-muted">Marketplace</label>
                  <select class="form-select form-select-sm" [(ngModel)]="formMarketplace" (ngModelChange)="onMarketplaceChange($event)">
                    @for (mp of MARKETPLACE_WORKFLOWS; track mp.id) {
                      <option [value]="mp.id">{{ mp.label }}</option>
                    }
                  </select>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-medium text-muted">Product Name</label>
                  <input class="form-control form-control-sm" [(ngModel)]="formName" placeholder="e.g. Printed Cotton Kurta" />
                </div>
                <div class="col-4">
                  <label class="form-label small fw-medium text-muted">Brand</label>
                  <input class="form-control form-control-sm" [(ngModel)]="formBrand" placeholder="Vrindaya" />
                </div>
                <div class="col-4">
                  <label class="form-label small fw-medium text-muted">Category</label>
                  <input class="form-control form-control-sm" [(ngModel)]="formCategory" placeholder="Women's Clothing" />
                </div>
                <div class="col-4">
                  <label class="form-label small fw-medium text-muted">Title</label>
                  <input class="form-control form-control-sm" [(ngModel)]="formTitle" placeholder="Product title for listing" />
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium text-muted">Description</label>
                  <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="formDescription" placeholder="Product description"></textarea>
                </div>
                <div class="col-3">
                  <label class="form-label small fw-medium text-muted">MRP</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="formMrp" />
                </div>
                <div class="col-3">
                  <label class="form-label small fw-medium text-muted">Selling Price</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="formSp" />
                </div>
                <div class="col-3">
                  <label class="form-label small fw-medium text-muted">Stock</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="formStock" />
                </div>
                <div class="col-3">
                  <label class="form-label small fw-medium text-muted">SEO Keywords</label>
                  <input class="form-control form-control-sm" [(ngModel)]="formSeo" placeholder="comma, separated" />
                </div>
                <div class="col-12">
                  <label class="form-label small fw-medium text-muted">Image URLs</label>
                  <div class="d-flex gap-2">
                    <input class="form-control form-control-sm" [(ngModel)]="formImageUrl" placeholder="https://..." (keydown.enter)="addImageUrl()" />
                    <button class="btn btn-sm btn-outline-secondary" (click)="addImageUrl()">Add</button>
                  </div>
                  @if (formImages().length) {
                    <div class="d-flex gap-1 mt-1 flex-wrap">
                      @for (url of formImages(); track url; let i = $index) {
                        <span class="badge bg-light text-dark px-2 py-1" style="font-size:.7rem">
                          {{ url.slice(0, 30) }}...
                          <button class="btn btn-sm btn-link text-danger p-0 ms-1" style="font-size:.6rem" (click)="formImages.update(u => u.filter((_, j) => j !== i))">&times;</button>
                        </span>
                      }
                    </div>
                  }
                </div>
                <!-- Attributes as key-value -->
                <div class="col-12">
                  <label class="form-label small fw-medium text-muted">Attributes (key: value)</label>
                  <div class="d-flex gap-2">
                    <input #attrKey class="form-control form-control-sm" style="width:150px" placeholder="key" />
                    <input #attrVal class="form-control form-control-sm" placeholder="value" />
                    <button class="btn btn-sm btn-outline-secondary" (click)="addAttribute(attrKey.value, attrVal.value); attrKey.value=''; attrVal.value=''">Add</button>
                  </div>
                  @if (formAttrs().length) {
                    <div class="d-flex gap-1 mt-1 flex-wrap">
                      @for (a of formAttrs(); track a.key; let i = $index) {
                        <span class="badge bg-light text-dark px-2 py-1" style="font-size:.7rem">
                          {{ a.key }}: {{ a.value }}
                          <button class="btn btn-sm btn-link text-danger p-0 ms-1" style="font-size:.6rem" (click)="formAttrs.update(aa => aa.filter((_, j) => j !== i))">&times;</button>
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer bg-white border-0">
              <button class="btn btn-sm btn-outline-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn btn-sm btn-primary" (click)="createTask()" [disabled]="!formName">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polygon points="5 3 19 12 5 21 5 3"/></svg> Enqueue Listing
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Screenshot Preview Modal -->
    @if (previewScreenshot(); as ss) {
      <div class="modal-backdrop fade show" (click)="previewScreenshot.set(null)"></div>
      <div class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-white border-0 py-2">
              <h6 class="modal-title small fw-semibold">{{ ss.label }}</h6>
              <button class="btn-close" (click)="previewScreenshot.set(null)"></button>
            </div>
            <div class="modal-body p-2 text-center">
              <img [src]="ss.dataUrl" alt="" loading="lazy" style="max-width:100%;border-radius:6px" />
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .auto-grid{display:grid;grid-template-columns:280px 1fr;gap:1rem;align-items:start}
    @media(max-width:992px){.auto-grid{grid-template-columns:1fr}}
    .step-card{border:1px solid #e5e7eb;border-radius:8px;padding:.5rem;text-align:center;transition:all .15s;background:#fff}
    .step-card.status-running{border-color:#4a90d9;background:#f0f4ff}
    .step-card.status-completed{border-color:#198754;background:#f0faf4}
    .step-card.status-failed{border-color:#dc3545;background:#fff5f5}
    .step-icon{font-size:.9rem;height:20px;display:flex;align-items:center;justify-content:center;margin-bottom:.25rem}
    .step-name{font-size:.72rem;font-weight:600;color:#1a1a2e;margin-bottom:.15rem}
    .step-desc{font-size:.62rem;color:#888}
    .log-container{background:#1a1a2e;color:#e0e0e0;border-radius:6px;padding:.5rem;max-height:300px;overflow-y:auto;font-size:.72rem;font-family:ui-monospace,monospace}
    .log-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .log-time{color:#888;margin-right:6px}
    .log-level{color:#569cd6;margin-right:6px}
    .log-step{color:#ce9178}
    .log-msg{color:#d4d4d4}
    .log-warn .log-level{color:#dcdcaa}
    .log-warn .log-msg{color:#dcdcaa}
    .log-error .log-level{color:#f44747}
    .log-error .log-msg{color:#f44747}
    .log-debug .log-msg{color:#6a9955}
    .screenshot-thumb{width:120px;flex-shrink:0;cursor:pointer;border:1px solid #e5e7eb;border-radius:6px;padding:4px;transition:border-color .15s}
    .screenshot-thumb:hover{border-color:#4a90d9}
    .screenshot-thumb img{width:100%;height:70px;object-fit:cover;border-radius:4px}
    .list-group-item:hover{background:#f5f5f8}
    .list-group-item.active{background:#f0f4ff;border-color:#e0e8f0;color:#1a1a2e}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationDashboardComponent implements OnDestroy {
  private readonly engine = inject(AutomationEngineService);

  readonly MARKETPLACE_WORKFLOWS = MARKETPLACE_WORKFLOWS;
  readonly activeTask = this.engine.active;
  readonly queue = this.engine.queue;
  readonly history = this.engine.history;
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showModal = signal(false);
  readonly previewScreenshot = signal<AutomationScreenshot | null>(null);
  readonly viewHistory = signal<any>(null);

  // Form state
  formMarketplace = 'flipkart';
  formName = '';
  formBrand = '';
  formCategory = '';
  formTitle = '';
  formDescription = '';
  formMrp = 0;
  formSp = 0;
  formStock = 0;
  formSeo = '';
  formImageUrl = '';
  formImages = signal<string[]>([]);
  formAttrs = signal<{ key: string; value: string }[]>([]);

  queuedCount = computed(() => this.queue().filter(t => t.status === 'queued').length);

  constructor() {
    this.engine.loadQueue();
  }

  platformLabel(id: string): string {
    return MARKETPLACE_WORKFLOWS.find(p => p.id === id)?.label || id;
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      queued: 'bg-secondary bg-opacity-10 text-secondary',
      running: 'bg-primary bg-opacity-10 text-primary',
      completed: 'bg-success bg-opacity-10 text-success',
      failed: 'bg-danger bg-opacity-10 text-danger',
      cancelled: 'bg-warning bg-opacity-10 text-warning',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  stepStatusClass(status: string): string {
    return 'status-' + status;
  }

  progressPercent(task: any): number {
    const completed = task.steps.filter((s: any) => s.status === 'completed' || s.status === 'skipped').length;
    return Math.round((completed / task.steps.length) * 100);
  }

  startQueue(): void {
    this.engine.startNext();
  }

  cancelCurrent(): void {
    this.engine.cancelCurrent();
  }

  cancelTask(taskId: string): void {
    this.engine.cancelTask(taskId);
  }

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  onMarketplaceChange(val: string): void {
    this.formMarketplace = val;
  }

  addImageUrl(): void {
    if (this.formImageUrl.trim()) {
      this.formImages.update(u => [...u, this.formImageUrl.trim()]);
      this.formImageUrl = '';
    }
  }

  addAttribute(key: string, value: string): void {
    if (key.trim() && value.trim()) {
      this.formAttrs.update(a => [...a, { key: key.trim(), value: value.trim() }]);
    }
  }

  private resetForm(): void {
    this.formMarketplace = 'flipkart';
    this.formName = '';
    this.formBrand = '';
    this.formCategory = '';
    this.formTitle = '';
    this.formDescription = '';
    this.formMrp = 0;
    this.formSp = 0;
    this.formStock = 0;
    this.formSeo = '';
    this.formImageUrl = '';
    this.formImages.set([]);
    this.formAttrs.set([]);
  }

  async createTask(): Promise<void> {
    const attrs: Record<string, string> = {};
    for (const a of this.formAttrs()) attrs[a.key] = a.value;

    await this.engine.enqueue(this.formMarketplace, {
      name: this.formName,
      brand: this.formBrand,
      category: this.formCategory,
      title: this.formTitle,
      description: this.formDescription,
      mrp: this.formMrp,
      sellingPrice: this.formSp,
      stock: this.formStock,
      images: this.formImages(),
      attributes: attrs,
      seoKeywords: this.formSeo,
    });

    this.closeModal();
    this.successMessage.set(`Listing queued for ${this.platformLabel(this.formMarketplace)}.`);
  }

  dateStr(d: any): string {
    return this.formatDate(typeof d === 'string' ? d : d?.toISOString?.() || '');
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  ngOnDestroy(): void {
    // Clean up on destroy
  }
}
