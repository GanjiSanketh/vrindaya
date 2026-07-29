import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { PromptManagementService } from '../../services/prompt-management.service';
import {
  PromptMarketplace, PromptCategory, PromptTemplate, PromptTemplateVersion,
  PROMPT_MARKETPLACES, PROMPT_MARKETPLACE_LABELS, PROMPT_CATEGORIES, PROMPT_CATEGORY_LABELS,
  PROMPT_VARIABLES, PROMPT_VARIABLE_LABELS, DEFAULT_PROMPTS,
} from '../../models/prompt-template.model';

const SAMPLE_VALUES: Record<string, string> = {
  product: 'Printed Cotton Kurta',
  vision: 'Cotton, Straight Cut, Round Neck, 3/4 Sleeves, Floral Print',
  brand: 'Vrindaya',
  fabric: 'Cotton',
  occasion: 'Casual Wear',
  keywords: 'cotton kurta, printed kurta, ethnic wear, casual kurta',
};

@Component({
  selector: 'app-prompt-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Prompt Management" subtitle="Create and manage AI prompt templates for each marketplace.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-danger" (click)="resetAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Reset All
        </button>
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <!-- Marketplace Tabs -->
      <div class="marketplace-tabs d-flex gap-2 mb-3 flex-wrap">
        @for (mp of marketplaces; track mp) {
          <button class="marketplace-tab" [class.active]="selectedMarketplace() === mp" (click)="selectMarketplace(mp)">
            {{ MARKETPLACE_LABELS[mp] }}
          </button>
        }
      </div>

      <!-- Main Content: Categories + Editor -->
      <div class="pm-grid">
        <!-- Category List -->
        <div class="pm-categories">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Categories</div>
            <div class="list-group list-group-flush" style="max-height:500px;overflow-y:auto">
              @for (cat of categories; track cat) {
                @let tpl = getTemplate(selectedMarketplace(), cat);
                @let active = selectedCategory() === cat;
                <button class="list-group-item list-group-item-action px-3 py-2" [class.active]="active" (click)="selectCategory(cat)">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="small fw-medium">{{ CATEGORY_LABELS[cat] }}</span>
                    @if (tpl?.version) { <span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.6rem">v{{ tpl!.version }}</span> }
                  </div>
                  <div class="small text-muted text-truncate" style="font-size:.72rem">{{ (tpl?.content || 'Empty').slice(0, 60) }}{{ (tpl?.content?.length ?? 0) > 60 ? '...' : '' }}</div>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Editor -->
        <div class="pm-editor">
          @if (editTemplate(); as tpl) {
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2" style="font-size:.85rem">
                <span class="fw-semibold">{{ CATEGORY_LABELS[tpl.category] }}</span>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-success" (click)="savePrompt()" [disabled]="saving()">
                    @if (saving()) { <span class="spinner-border spinner-border-sm"></span> }
                    @else {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save
                    }
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="deletePrompt()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div class="card-body p-3">
                <!-- Name -->
                <div class="mb-2">
                  <label class="form-label small fw-medium text-muted">Template Name</label>
                  <input class="form-control form-control-sm" [value]="tpl.name" (input)="editName($event)" />
                </div>
                <!-- Content -->
                <div class="mb-2">
                  <label class="form-label small fw-medium text-muted">Prompt Content</label>
                  <div class="d-flex gap-1 flex-wrap mb-1">
                    @for (v of PROMPT_VARIABLES; track v) {
                      <button class="btn btn-sm btn-outline-info py-0 px-2" style="font-size:.72rem" (click)="insertVariable(v)">{{ '{{' + v + '}}' }}</button>
                    }
                  </div>
                  <textarea class="form-control" rows="6" style="font-size:.82rem;font-family:ui-monospace,monospace" [value]="tpl.content" (input)="editContent($event)"></textarea>
                </div>
                <!-- Version comment -->
                <div class="mb-2">
                  <label class="form-label small fw-medium text-muted">Change Comment</label>
                  <input class="form-control form-control-sm" placeholder="What changed?" [(ngModel)]="saveComment" />
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
                <span class="fw-semibold">Preview</span>
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="showRawToggle" [(ngModel)]="showRaw" />
                  <label class="form-check-label small" for="showRawToggle">Show variables</label>
                </div>
              </div>
              <div class="card-body p-3">
                @if (showRaw()) {
                  <pre class="mb-0 small" style="white-space:pre-wrap;color:#555;font-size:.82rem">{{ tpl.content || '(empty)' }}</pre>
                } @else {
                  <div class="small" style="white-space:pre-wrap;font-size:.82rem;color:#1a1a2e">{{ previewText() }}</div>
                }
              </div>
            </div>

            <!-- Version History -->
            @if (tpl.versions.length) {
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-2 fw-semibold" style="font-size:.85rem">Version History ({{ tpl.versions.length }})</div>
                <div class="card-body p-0">
                  @for (ver of tpl.versions.slice().reverse(); track ver.id) {
                    <div class="version-row p-2 border-bottom">
                      <div class="d-flex justify-content-between align-items-start">
                        <div>
                          <span class="badge bg-secondary bg-opacity-10 text-secondary me-1" style="font-size:.7rem">v{{ ver.version }}</span>
                          <span class="small text-muted">{{ formatDate(ver.createdAt) }}</span>
                          @if (ver.comment) { <span class="small text-muted ms-1">&mdash; {{ ver.comment }}</span> }
                        </div>
                        <button class="btn btn-sm btn-link text-decoration-none py-0 px-1" (click)="restoreVersion(ver)" title="Restore this version">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                      </div>
                      <div class="small text-muted text-truncate" style="font-size:.72rem">{{ ver.content.slice(0, 80) }}{{ ver.content.length > 80 ? '...' : '' }}</div>
                    </div>
                  }
                </div>
              </div>
            }
          } @else {
            <div class="card border-0 shadow-sm">
              <div class="card-body text-center py-5">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <p class="text-muted small mt-3 mb-0">Select a category to edit its prompt template.</p>
                <p class="text-muted small mb-0">Use variable buttons to insert dynamic fields.</p>
              </div>
            </div>
          }
        </div>
      </div>
    </app-marketplace-layout>
  `,
  styles: [`
    .pm-grid{display:grid;grid-template-columns:240px 1fr;gap:1rem;align-items:start}
    @media(max-width:992px){.pm-grid{grid-template-columns:1fr}}
    .marketplace-tab{padding:.35rem 1rem;border:1px solid #e0e0e0;border-radius:20px;background:#fff;font-size:.82rem;font-weight:500;color:#555;cursor:pointer;transition:all .15s}
    .marketplace-tab:hover{border-color:#aaa;background:#f5f5f5}
    .marketplace-tab.active{border-color:#4a90d9;background:#4a90d9;color:#fff}
    .list-group-item.active{background:#f0f4ff;border-color:#e0e8f0;color:#1a1a2e}
    .version-row:hover{background:#fafbfc}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptManagementComponent {
  private readonly promptSvc = inject(PromptManagementService);

  readonly marketplaces = PROMPT_MARKETPLACES;
  readonly categories = PROMPT_CATEGORIES;
  readonly MARKETPLACE_LABELS = PROMPT_MARKETPLACE_LABELS;
  readonly CATEGORY_LABELS = PROMPT_CATEGORY_LABELS;
  readonly PROMPT_VARIABLES = PROMPT_VARIABLES;
  readonly PROMPT_VARIABLE_LABELS = PROMPT_VARIABLE_LABELS;

  readonly selectedMarketplace = signal<PromptMarketplace>('flipkart');
  readonly selectedCategory = signal<PromptCategory | null>(null);
  readonly showRaw = signal(false);
  readonly saving = signal(false);
  readonly saveComment = signal('');
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly templates = this.promptSvc.templates;

  editTemplate = computed(() => {
    const mp = this.selectedMarketplace();
    const cat = this.selectedCategory();
    if (!cat) return null;
    const tpl = this.promptSvc.getTemplate(mp, cat);
    return tpl ?? null;
  });

  previewText = computed(() => {
    const tpl = this.editTemplate();
    if (!tpl) return '';
    return this.promptSvc.preview(tpl.content, SAMPLE_VALUES);
  });

  getTemplate(mp: PromptMarketplace, cat: PromptCategory): PromptTemplate | undefined {
    return this.promptSvc.getTemplate(mp, cat);
  }

  getTemplatesForMarketplace(mp: PromptMarketplace): PromptTemplate[] {
    return this.promptSvc.getTemplates(mp);
  }

  selectMarketplace(mp: PromptMarketplace): void {
    this.selectedMarketplace.set(mp);
    this.selectedCategory.set(null);
    this.saveComment.set('');
    this.showRaw.set(false);
  }

  selectCategory(cat: PromptCategory): void {
    this.selectedCategory.set(cat);
    this.saveComment.set('');
    this.showRaw.set(false);
  }

  editName(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const tpl = this.editTemplate();
    if (!tpl) return;
    tpl.name = val;
    // trigger signal update by replacing ref
    this.templates.update(list => list.map(t => t.id === tpl.id ? { ...tpl } : t));
  }

  editContent(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    const tpl = this.editTemplate();
    if (!tpl) return;
    tpl.content = val;
    this.templates.update(list => list.map(t => t.id === tpl.id ? { ...tpl } : t));
  }

  insertVariable(variable: string): void {
    const tpl = this.editTemplate();
    if (!tpl) return;
    tpl.content += `{{${variable}}}`;
    this.templates.update(list => list.map(t => t.id === tpl.id ? { ...tpl } : t));
  }

  savePrompt(): void {
    const tpl = this.editTemplate();
    if (!tpl) return;
    this.saving.set(true);
    try {
      this.promptSvc.saveTemplate({ ...tpl }, this.saveComment() || 'Updated via prompt manager');
      this.saveComment.set('');
      this.successMessage.set(`Saved "${tpl.name}" (v${tpl.version + 1}).`);
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to save.');
    } finally {
      this.saving.set(false);
    }
  }

  deletePrompt(): void {
    const tpl = this.editTemplate();
    if (!tpl) return;
    this.promptSvc.deleteTemplate(tpl.id);
    this.selectedCategory.set(null);
    this.successMessage.set(`Deleted "${tpl.name}".`);
  }

  restoreVersion(ver: PromptTemplateVersion): void {
    const tpl = this.editTemplate();
    if (!tpl) return;
    this.promptSvc.restoreVersion(tpl.id, ver.id, `Restored from v${ver.version}`);
    this.successMessage.set(`Restored "${tpl.name}" to v${ver.version}.`);
  }

  resetAll(): void {
    this.promptSvc.resetAll();
    this.selectedCategory.set(null);
    this.successMessage.set('All prompts reset to defaults.');
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
