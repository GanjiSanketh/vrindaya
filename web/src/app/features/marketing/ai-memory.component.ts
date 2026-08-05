import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { AiMemoryService } from './ai-memory.service';
import {
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_META,
  MEMORY_SOURCES,
  type AiMemoryEntry,
  type MemoryCategory,
} from './models/ai-memory.model';

interface MemoryForm {
  id?: string;
  category: MemoryCategory;
  title: string;
  fields: Record<string, string>;
  tags: string;
  source: string;
  confidence: number;
}

@Component({
  selector: 'app-ai-memory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="am-page">
      <div class="am-header">
        <div>
          <h1 class="am-title"><i class="bi bi-database-gear"></i> AI Memory</h1>
          <p class="am-desc">Structured memory the AI recalls for every generation — brand, products, campaigns and learnings.</p>
        </div>
        <div class="am-actions">
          <span class="am-total badge">{{ totalEntry() }} memories</span>
          <button class="btn am-btn-primary" (click)="openCreate()">
            <i class="bi bi-plus-lg"></i> Add Memory
          </button>
        </div>
      </div>

      <div class="am-layout">
        <aside class="am-side">
          <div class="am-cat-list">
            <button class="am-cat" [class.am-cat-active]="activeCategory() === 'All'" (click)="activeCategory.set('All')">
              <i class="bi bi-grid"></i>
              <span>All Memory</span>
              <span class="am-cat-count">{{ totalEntry() }}</span>
            </button>
            @for (cat of categories(); track cat.id) {
              <button class="am-cat" [class.am-cat-active]="activeCategory() === cat.id" (click)="activeCategory.set(cat.id)">
                <i class="bi {{ cat.icon }}" [style.color]="cat.color"></i>
                <span>{{ cat.id }}</span>
                <span class="am-cat-count">{{ countFor(cat.id) }}</span>
              </button>
            }
          </div>
        </aside>

        <section class="am-main">
          <div class="am-toolbar">
            <div class="am-search">
              <i class="bi bi-search"></i>
              <input class="form-control am-search-input" [(ngModel)]="search" placeholder="Search memory..." />
            </div>
            <div class="am-active-cat">{{ activeCategory() }}</div>
          </div>

          @if (filtered().length === 0) {
            <div class="am-empty">
              <i class="bi bi-inbox"></i>
              <p>No memory entries found.</p>
            </div>
          } @else {
            <div class="am-list">
              @for (e of filtered(); track e.id) {
                <div class="am-entry" [style.border-left-color]="categoryOf(e).color">
                  <div class="am-entry-head">
                    <div class="am-entry-avatar" [style.background]="categoryOf(e).color">
                      <i class="bi {{ categoryOf(e).icon }}"></i>
                    </div>
                    <div class="am-entry-title">
                      <strong>{{ e.title }}</strong>
                      <span class="am-entry-meta">
                        <i class="bi {{ categoryOf(e).icon }}"></i> {{ e.category }} · {{ e.source }}
                      </span>
                    </div>
                    <span class="am-confidence" title="Confidence">
                      <i class="bi bi-battery-charging"></i> {{ e.confidence }}%
                    </span>
                  </div>
                  <div class="am-entry-fields">
                    @for (f of fieldPreview(e); track $index) {
                      <div class="am-field-pair">
                        <span class="am-field-key">{{ f.key }}</span>
                        <span class="am-field-val">{{ f.value }}</span>
                      </div>
                    }
                  </div>
                  @if (e.tags.length > 0) {
                    <div class="am-tags">
                      @for (t of e.tags; track t) {
                        <span class="am-tag">{{ t }}</span>
                      }
                    </div>
                  }
                  <div class="am-entry-actions">
                    <button class="am-icon-btn" (click)="openEdit(e)" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="am-icon-btn" (click)="duplicate(e)" title="Duplicate"><i class="bi bi-files"></i></button>
                    <button class="am-icon-btn am-icon-danger" (click)="remove(e)" title="Delete"><i class="bi bi-trash"></i></button>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </div>

      @if (formOpen()) {
        <div class="am-modal-overlay" (click)="closeForm()">
          <div class="am-modal" (click)="$event.stopPropagation()">
            <h2 class="am-modal-title">{{ form().id ? 'Edit' : 'Add' }} Memory</h2>
            <div class="am-form">
              <div class="am-f-row">
                <div class="am-f-field">
                  <label class="am-label">Category</label>
                  <select class="form-select am-input" [(ngModel)]="form().category" [disabled]="!!form().id" (ngModelChange)="onCategoryChange()">
                    @for (cat of MEMORY_CATEGORIES; track cat.id) {
                      <option [value]="cat.id">{{ cat.id }}</option>
                    }
                  </select>
                </div>
                <div class="am-f-field">
                  <label class="am-label">Title</label>
                  <input class="form-control am-input" [(ngModel)]="form().title" placeholder="e.g. Core Brand Identity" />
                </div>
              </div>

              <div class="am-f-section">
                <span class="am-section-label"><i class="bi {{ categoryMeta(form().category).icon }}"></i> {{ form().category }} Details</span>
                @for (f of categoryMeta(form().category).fields; track f.key) {
                  <div class="am-f-field">
                    <label class="am-label">{{ f.label }}</label>
                    @if (f.type === 'textarea') {
                      <textarea class="form-control am-input am-textarea" [(ngModel)]="form().fields[f.key]" rows="3"></textarea>
                    } @else {
                      <input class="form-control am-input" [(ngModel)]="form().fields[f.key]" />
                    }
                  </div>
                }
              </div>

              <div class="am-f-row">
                <div class="am-f-field">
                  <label class="am-label">Tags</label>
                  <input class="form-control am-input" [(ngModel)]="form().tags" placeholder="comma separated" />
                </div>
                <div class="am-f-field">
                  <label class="am-label">Source</label>
                  <select class="form-select am-input" [(ngModel)]="form().source">
                    @for (s of MEMORY_SOURCES; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="am-f-field">
                <label class="am-label">Confidence <span class="am-value">{{ form().confidence }}%</span></label>
                <input type="range" class="am-range" min="0" max="100" step="5" [(ngModel)]="form().confidence" />
              </div>
            </div>
            <div class="am-modal-actions">
              <button class="btn btn-outline-secondary" (click)="closeForm()">Cancel</button>
              <button class="btn am-btn-primary" (click)="save()" [disabled]="!form().title.trim()">
                <i class="bi bi-check-lg"></i> Save Memory
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './ai-memory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiMemoryComponent {
  readonly MEMORY_CATEGORIES = MEMORY_CATEGORIES;
  readonly MEMORY_SOURCES = MEMORY_SOURCES;
  readonly categories = computed(() => MEMORY_CATEGORIES);

  private readonly toast = inject(ToastService);
  private readonly service = inject(AiMemoryService);

  readonly activeCategory = signal<MemoryCategory | 'All'>('All');
  readonly search = signal('');
  readonly formOpen = signal(false);
  readonly form = signal<MemoryForm>(this.emptyForm());

  readonly totalEntry = computed(() => this.service.entries().length);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.service.entries().filter(e =>
      (cat === 'All' || e.category === cat) &&
      (q === '' || e.title.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        Object.values(e.fields).some(v => v.toLowerCase().includes(q))),
    );
  });

  readonly categoryMeta = (c: MemoryCategory) => MEMORY_CATEGORY_META[c];
  readonly categoryOf = (e: AiMemoryEntry) => MEMORY_CATEGORY_META[e.category];

  readonly countFor = (c: MemoryCategory) => this.service.countFor(c);

  readonly fieldPreview = (e: AiMemoryEntry) =>
    this.categoryMeta(e.category).fields
      .map(f => ({ key: f.label, value: e.fields[f.key] }))
      .filter(f => f.value?.trim());

  openCreate(): void {
    this.form.set(this.emptyForm());
    this.formOpen.set(true);
  }

  openEdit(e: AiMemoryEntry): void {
    this.form.set({
      id: e.id,
      category: e.category,
      title: e.title,
      fields: { ...e.fields },
      tags: e.tags.join(', '),
      source: e.source,
      confidence: e.confidence,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onCategoryChange(): void {
    if (this.form().id) return;
    this.form.set({
      ...this.form(),
      fields: this.emptyFields(this.form().category),
    });
  }

  save(): void {
    const f = this.form();
    if (!f.title.trim()) return;
    const draft = {
      category: f.category,
      title: f.title.trim(),
      fields: f.fields,
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
      source: f.source,
      confidence: f.confidence,
    };
    if (f.id) {
      this.service.update(f.id, draft);
      this.toast.success('Memory updated');
    } else {
      this.service.create(draft);
      this.toast.success('Memory added');
    }
    this.formOpen.set(false);
  }

  remove(e: AiMemoryEntry): void {
    if (confirm(`Delete "${e.title}"?`)) {
      this.service.remove(e.id);
      this.toast.info('Memory deleted');
    }
  }

  duplicate(e: AiMemoryEntry): void {
    this.service.create({
      category: e.category,
      title: `${e.title} (copy)`,
      fields: { ...e.fields },
      tags: [...e.tags],
      source: e.source,
      confidence: e.confidence,
    });
    this.toast.info('Memory duplicated');
  }

  private emptyForm(): MemoryForm {
    return {
      category: 'Brand Information',
      title: '',
      fields: this.emptyFields('Brand Information'),
      tags: '',
      source: MEMORY_SOURCES[0],
      confidence: 85,
    };
  }

  private emptyFields(category: MemoryCategory): Record<string, string> {
    const fields: Record<string, string> = {};
    this.categoryMeta(category).fields.forEach(f => (fields[f.key] = ''));
    return fields;
  }
}