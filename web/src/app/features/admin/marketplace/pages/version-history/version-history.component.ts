import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { VersionHistoryService, VersionDiff } from '../../services/version-history.service';
import { GENERATION_TYPE_LABELS, VersionEntry } from '../../models/version-history.model';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Version History" subtitle="Every AI generation is saved. Compare, restore, and never lose previous work.">
      <div actions class="d-flex gap-2 align-items-center flex-wrap">
        <span class="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2">{{ filtered().length }} versions</span>
        @if (selectedIds().length === 2) {
          <button class="btn btn-sm btn-outline-primary" (click)="enterCompare()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Compare Selected
          </button>
        }
        @if (selectedIds().length > 0) {
          <button class="btn btn-sm btn-outline-danger" (click)="deleteSelected()">Delete ({{ selectedIds().length }})</button>
        }
        <button class="btn btn-sm btn-outline-secondary" (click)="exportJson()">Export JSON</button>
        <button class="btn btn-sm btn-outline-danger" (click)="clearAll()">Clear All</button>
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <!-- Filters -->
      <div class="d-flex gap-2 flex-wrap mb-3 align-items-center">
        <select class="form-select form-select-sm" style="width:auto" [value]="filterType()" (change)="onFilterType($event)">
          <option value="">All types</option>
          @for (kv of typeOptions(); track kv.key) {
            <option [value]="kv.key">{{ kv.label }}</option>
          }
        </select>
        <select class="form-select form-select-sm" style="width:auto" [value]="filterProvider()" (change)="onFilterProvider($event)">
          <option value="">All providers</option>
          @for (p of providerOptions(); track p) {
            <option [value]="p">{{ p }}</option>
          }
        </select>
        <input type="text" class="form-control form-control-sm" style="width:200px" placeholder="Search content..." [value]="searchText()" (input)="onSearch($event)" />
        @if (compareMode()) {
          <button class="btn btn-sm btn-outline-secondary" (click)="exitCompare()">&larr; Back to timeline</button>
        }
      </div>

      @if (compareMode(); as cmp) {
        <!-- Side-by-side Comparison -->
        @let versionA = cmp.a; @let versionB = cmp.b;
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
            <span class="fw-semibold">Comparing</span>
            <div class="d-flex gap-3 small">
              <span><strong>A:</strong> {{ versionA.label }} <span class="text-muted">({{ formatDate(versionA.createdAt) }})</span></span>
              <span><strong>B:</strong> {{ versionB.label }} <span class="text-muted">({{ formatDate(versionB.createdAt) }})</span></span>
            </div>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="small fw-semibold text-muted mb-2">Version A — {{ versionA.providerLabel }} / {{ versionA.model }}</div>
                <pre class="version-content">{{ renderVersion(versionA) }}</pre>
              </div>
              <div class="col-md-6">
                <div class="small fw-semibold text-muted mb-2">Version B — {{ versionB.providerLabel }} / {{ versionB.model }}</div>
                <pre class="version-content">{{ renderVersion(versionB) }}</pre>
              </div>
            </div>
            @let diffs = comparisonDiffs();
            @if (diffs.length) {
              <hr />
              <div class="small fw-semibold mb-2">Differences ({{ diffs.filter(d => d.changed).length }} changed)</div>
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0" style="font-size:.78rem">
                  <thead class="table-light"><tr><th style="width:25%">Field</th><th style="width:37.5%">Version A</th><th style="width:37.5%">Version B</th></tr></thead>
                  <tbody>
                    @for (d of diffs; track d.field) {
                      <tr [class.table-warning]="d.changed">
                        <td class="fw-medium">{{ d.field }}</td>
                        <td [class.text-danger]="d.changed"><pre class="mb-0" style="white-space:pre-wrap;font-size:.75rem">{{ trimValue(d.valueA) }}</pre></td>
                        <td [class.text-success]="d.changed"><pre class="mb-0" style="white-space:pre-wrap;font-size:.75rem">{{ trimValue(d.valueB) }}</pre></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-muted small mb-0 mt-2">No differences found between these versions.</p>
            }
          </div>
        </div>
      } @else {
        <!-- Timeline -->
        @let list = filtered();
        @if (!list.length) {
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center py-5">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <p class="text-muted small mt-3 mb-0">No versions found.</p>
              <p class="text-muted small mb-0">Generate content in the AI Studio to create version history.</p>
            </div>
          </div>
        }
        @for (entry of list; track entry.id) {
          <div class="version-timeline-row">
            <!-- Timeline line -->
            <div class="timeline-line"><div class="timeline-dot" [class.bg-success]="entry.approved" [class.bg-secondary]="!entry.approved"></div></div>
            <!-- Version card -->
            <div class="card border-0 shadow-sm mb-3 flex-fill" [class.border-success]="entry.approved" style="border-left:3px solid transparent">
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <input type="checkbox" class="form-check-input mt-0" [checked]="selectedIds().includes(entry.id)" (change)="toggleSelect(entry.id)" />
                    <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size:.7rem">{{ GENERATION_LABELS[entry.generationType] || entry.generationType }}</span>
                    @if (entry.approved) { <span class="badge bg-success bg-opacity-10 text-success" style="font-size:.65rem">Approved</span> }
                    <span class="small text-muted">{{ formatDate(entry.createdAt) }}</span>
                    <span class="small text-muted">&middot; {{ entry.providerLabel }} / {{ entry.model }}</span>
                  </div>
                  <div class="d-flex gap-1 flex-shrink-0">
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-muted" title="Restore in AI Studio" (click)="restore(entry)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-muted" title="Duplicate" (click)="duplicate(entry)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-muted" title="Copy content" (click)="copy(entry)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-muted" title="Export" (click)="exportSingle(entry)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1 text-danger" title="Delete" (click)="deleteSingle(entry)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <div class="mt-2 ms-4">
                  <div class="small text-muted text-truncate" style="font-size:.8rem">{{ entry.prompt.slice(0, 120) }}{{ entry.prompt.length > 120 ? '...' : '' }}</div>
                  @if (entry.generatedContent | keyvalue; as fields) {
                    <div class="d-flex gap-2 flex-wrap mt-1">
                      @for (f of fields; track f.key) {
                        @if (isSimpleValue(f.value)) {
                          <span class="badge bg-light text-dark px-2 py-1" style="font-size:.7rem;font-weight:400">{{ f.key }}: {{ displayValue(f.value) }}</span>
                        }
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .version-timeline-row{display:flex;gap:1rem;position:relative}
    .timeline-line{display:flex;flex-direction:column;align-items:center;width:20px;flex-shrink:0;padding-top:6px}
    .timeline-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;position:relative;z-index:1}
    .version-timeline-row:not(:last-child) .timeline-line::after{content:'';width:2px;flex:1;background:#e0e0e0;margin-top:4px}
    .version-content{font-size:.8rem;white-space:pre-wrap;background:#f8f9fa;padding:.75rem;border-radius:6px;max-height:400px;overflow-y:auto;margin-bottom:0}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VersionHistoryComponent {
  private readonly historySvc = inject(VersionHistoryService);
  private readonly router = inject(Router);

  readonly GENERATION_LABELS = GENERATION_TYPE_LABELS;
  readonly versions = this.historySvc.all;

  readonly searchText = signal('');
  readonly filterType = signal('');
  readonly filterProvider = signal('');
  readonly selectedIds = signal<string[]>([]);
  readonly compareIds = signal<[string, string] | null>(null);
  readonly compareData = signal<{ a: VersionEntry; b: VersionEntry; diffs: VersionDiff[] } | null>(null);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  compareMode = computed(() => {
    const d = this.compareData();
    return d ? d : null;
  });

  typeOptions = computed(() => {
    const set = new Set(this.versions().map(v => v.generationType));
    return [...set].map(key => ({ key, label: GENERATION_TYPE_LABELS[key] || key }));
  });

  providerOptions = computed(() => {
    const set = new Set(this.versions().map(v => v.providerLabel));
    return [...set].sort();
  });

  filtered = computed(() => {
    let list = this.versions();
    const type = this.filterType();
    const provider = this.filterProvider();
    const search = this.searchText().toLowerCase();
    if (type) list = list.filter(v => v.generationType === type);
    if (provider) list = list.filter(v => v.providerLabel === provider);
    if (search) list = list.filter(v =>
      v.label.toLowerCase().includes(search) ||
      v.prompt.toLowerCase().includes(search) ||
      JSON.stringify(v.generatedContent).toLowerCase().includes(search)
    );
    return list;
  });

  comparisonDiffs = computed(() => this.compareData()?.diffs ?? []);

  toggleSelect(id: string): void {
    this.selectedIds.update(ids => {
      if (ids.includes(id)) return ids.filter(i => i !== id);
      if (ids.length >= 2) {
        this.error.set('You can compare up to 2 versions at a time.');
        return ids;
      }
      return [...ids, id];
    });
  }

  enterCompare(): void {
    const ids = this.selectedIds();
    if (ids.length !== 2) return;
    const a = this.historySvc.get(ids[0]);
    const b = this.historySvc.get(ids[1]);
    if (!a || !b) return;
    const diffs = this.historySvc.compare(ids[0], ids[1]);
    this.compareData.set({ a, b, diffs });
  }

  exitCompare(): void {
    this.compareData.set(null);
  }

  restore(entry: VersionEntry): void {
    localStorage.setItem('vrindaya_restore_version', JSON.stringify(entry));
    this.router.navigate(['/admin', 'marketplace', 'ai-studio']);
    this.successMessage.set('Version data prepared. Opening AI Studio...');
  }

  duplicate(entry: VersionEntry): void {
    const dup = this.historySvc.duplicate(entry.id);
    if (dup) this.successMessage.set(`Duplicated as "${dup.label}".`);
  }

  copy(entry: VersionEntry): void {
    const text = this.renderVersion(entry);
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Version content copied to clipboard.');
    }).catch(() => {
      this.error.set('Failed to copy.');
    });
  }

  exportSingle(entry: VersionEntry): void {
    const json = this.historySvc.exportJson([entry.id]);
    this.downloadFile(json, `version-${entry.id.slice(0, 8)}.json`, 'application/json');
  }

  exportJson(): void {
    const ids = this.selectedIds();
    const json = this.historySvc.exportJson(ids.length ? ids : undefined);
    this.downloadFile(json, `versions-export-${Date.now()}.json`, 'application/json');
  }

  deleteSingle(entry: VersionEntry): void {
    this.historySvc.delete(entry.id);
    this.selectedIds.update(ids => ids.filter(i => i !== entry.id));
    this.successMessage.set(`Deleted "${entry.label}".`);
  }

  deleteSelected(): void {
    const ids = this.selectedIds();
    this.historySvc.deleteMultiple(ids);
    this.selectedIds.set([]);
    this.successMessage.set(`Deleted ${ids.length} version(s).`);
  }

  clearAll(): void {
    this.historySvc.clearAll();
    this.selectedIds.set([]);
    this.successMessage.set('All version history cleared.');
  }

  onFilterType(event: Event): void {
    this.filterType.set((event.target as HTMLSelectElement).value);
  }

  onFilterProvider(event: Event): void {
    this.filterProvider.set((event.target as HTMLSelectElement).value);
  }

  onSearch(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  isSimpleValue(val: any): boolean {
    return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
  }

  displayValue(val: any): string {
    if (Array.isArray(val)) return val.slice(0, 3).join(', ') + (val.length > 3 ? '...' : '');
    return String(val).slice(0, 60);
  }

  renderVersion(entry: VersionEntry): string {
    const lines: string[] = [
      `[${GENERATION_TYPE_LABELS[entry.generationType] || entry.generationType}]`,
      `Provider: ${entry.providerLabel} / ${entry.model}`,
      `Date: ${new Date(entry.createdAt).toLocaleString('en-IN')}`,
      '',
      '--- Generated Content ---',
    ];
    for (const [key, val] of Object.entries(entry.generatedContent)) {
      const str = Array.isArray(val) ? val.join(', ') : String(val);
      lines.push(`${key}: ${str}`);
    }
    if (entry.visionResult) {
      lines.push('', '--- Vision Result ---', entry.visionResult.raw.slice(0, 200));
    }
    lines.push('', '--- Prompt ---', entry.prompt);
    return lines.join('\n');
  }

  trimValue(val: string): string {
    return val.length > 200 ? val.slice(0, 200) + '...' : val;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
