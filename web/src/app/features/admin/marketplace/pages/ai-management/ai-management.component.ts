import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { PromptManagementService } from '../../services/prompt-management.service';
import { AIProviderSettingsService } from '../../services/ai/ai-provider-settings.service';
import type { AIProviderType } from '../../services/ai/ai-settings.model';
import { AIService } from '../../services/ai.service';
import { AITestingService } from '../../services/ai-listing.service';
import { MarketplaceLogService } from '../../services/marketplace-log.service';
import { VersionHistoryService } from '../../services/version-history.service';
import { ChartComponent } from '../../../../../shared/components/chart/chart.component';
import {
  PROMPT_CATEGORIES, PROMPT_CATEGORY_LABELS, PROMPT_MARKETPLACES,
  PROMPT_MARKETPLACE_LABELS, PROMPT_VARIABLES,
  type PromptTemplate, type PromptTemplateVersion,
  type PromptMarketplace, type PromptCategory,
} from '../../models/prompt-template.model';
import type { MarketplaceLog } from '../../models/marketplace-log.model';

const SAMPLE_VALUES: Record<string, string> = {
  product: 'Printed Cotton Kurta', vision: 'Cotton, Straight Cut, Round Neck, 3/4 Sleeves, Floral Print',
  brand: 'Vrindaya', fabric: 'Cotton', occasion: 'Casual Wear', keywords: 'cotton kurta, printed kurta, ethnic wear',
};

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude', ollama: 'Ollama',
  openrouter: 'OpenRouter', 'azure-openai': 'Azure OpenAI',
};

@Component({
  selector: 'app-ai-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent, ChartComponent],
  template: `
    <app-marketplace-layout title="AI Management" subtitle="Manage prompts, monitor providers, track usage and costs.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" (click)="tab.set('overview')" [class.btn-primary]="tab()==='overview'">Overview</button>
        <button class="btn btn-sm btn-outline-primary" (click)="tab.set('prompts')" [class.btn-primary]="tab()==='prompts'">Prompts</button>
        <button class="btn btn-sm btn-outline-primary" (click)="tab.set('history')" [class.btn-primary]="tab()==='history'">History</button>
        <button class="btn btn-sm btn-outline-primary" (click)="tab.set('logs')" [class.btn-primary]="tab()==='logs'">Logs</button>
      </div>

      @if (error()) { <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div> }
      @if (successMessage()) { <div class="alert alert-success py-2 small border-0 d-flex justify-content-between mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div> }

      <!-- =================== OVERVIEW =================== -->
      @if (tab() === 'overview') {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center py-3">
              <div class="h4 mb-0 fw-semibold">{{ promptSvc.templates().length }}</div>
              <div class="small text-muted">Prompt Templates</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center py-3">
              <div class="h4 mb-0 fw-semibold">{{ totalVersions() }}</div>
              <div class="small text-muted">Total Versions</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center py-3">
              <div class="h4 mb-0 fw-semibold">{{ totalGenerations() }}</div>
              <div class="small text-muted">AI Generations</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center py-3">
              <div class="h4 mb-0 fw-semibold" [class.text-success]="activeProviderLabel() !== 'None'" [class.text-muted]="activeProviderLabel() === 'None'">{{ activeProviderLabel() }}</div>
              <div class="small text-muted">Active Provider</div>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white fw-semibold small py-2">Generations by Provider</div>
              <div class="card-body"><app-chart [type]="'doughnut'" [labels]="generationsByProvider().labels" [data]="generationsByProvider().data" [datasetLabel]="'Generations'" /></div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white fw-semibold small py-2">Estimated Cost by Provider</div>
              <div class="card-body"><app-chart [type]="'horizontalBar'" [labels]="costByProvider().labels" [data]="costByProvider().data" [datasetLabel]="'Cost ($)'" [color]="'#b45309'" /></div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white fw-semibold small py-2">Provider Health</div>
          <div class="card-body">
            <div class="row g-2">
              @for (p of providerConfigs(); track p.provider) {
                <div class="col-6 col-md-4 col-lg-2">
                  <div class="card text-center py-2" [class.border-success]="p.enabled" [class.border-danger]="!p.enabled" style="height:100%">
                    <div class="fw-medium small">{{ PROVIDER_LABELS[p.provider] }}</div>
                    <div class="mt-1"><span class="badge" [class]="p.enabled ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'">{{ p.enabled ? 'Active' : 'Disabled' }}</span></div>
                    <div class="small text-muted mt-1">{{ p.model || '—' }}</div>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 mt-1 small" (click)="testProvider(p.provider)" [disabled]="testingProviders()[p.provider]">{{ testingProviders()[p.provider] ? 'Testing...' : 'Test' }}</button>
                    @if (providerTestResults()[p.provider]; as res) {
                      <div class="small" [class.text-success]="res.ok" [class.text-danger]="!res.ok">{{ res.ok ? 'Connected' : 'Failed' }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- =================== PROMPTS =================== -->
      @if (tab() === 'prompts') {
        <div class="d-flex gap-2 mb-3 flex-wrap align-items-center">
          <div class="input-group input-group-sm" style="width:180px">
            <span class="input-group-text bg-white border-end-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input class="form-control border-start-0 ps-0" placeholder="Search prompts..." [value]="searchTerm()" (input)="onSearchInput($event)" />
          </div>
          <select class="form-select form-select-sm" style="width:auto" (change)="filterMarketplace.set($any($event.target).value)">
            <option value="">All Marketplaces</option> @for (m of PROMPT_MARKETPLACES; track m) { <option [value]="m">{{ MARKETPLACE_LABELS[m] }}</option> }
          </select>
          <select class="form-select form-select-sm" style="width:auto" (change)="filterCategory.set($any($event.target).value)">
            <option value="">All Categories</option> @for (c of PROMPT_CATEGORIES; track c) { <option [value]="c">{{ CATEGORY_LABELS[c] }}</option> }
          </select>
          <span class="small text-muted">{{ filteredPrompts().length }} prompts</span>
        </div>

        <div class="row g-2 mb-3">
          @for (tpl of filteredPrompts(); track tpl.id) {
            <div class="col-12 col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm h-100" style="cursor:pointer" (click)="selectPromptForEdit(tpl)">
                <div class="card-body p-2 d-flex align-items-center gap-2">
                  <div class="flex-grow-1 min-w-0">
                    <div class="fw-medium small">{{ tpl.name }}</div>
                    <div class="d-flex gap-1 mt-1 flex-wrap">
                      <span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.6rem">{{ mpLabel(tpl.marketplace) }}</span>
                      <span class="badge bg-info bg-opacity-10 text-info" style="font-size:.6rem">{{ catLabel(tpl.category) }}</span>
                      @if (tpl.version) { <span class="badge bg-dark bg-opacity-10 text-dark" style="font-size:.6rem">v{{ tpl.version }}</span> }
                    </div>
                    <div class="small text-muted text-truncate mt-1" style="font-size:.72rem">{{ tpl.content.slice(0, 80) }}{{ tpl.content.length > 80 ? '...' : '' }}</div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        @if (editingPrompt(); as tpl) {
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span class="fw-semibold small">{{ tpl.name }}</span>
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline-success" (click)="saveEditedPrompt()" [disabled]="saving()">Save</button>
                <button class="btn btn-sm btn-outline-danger" (click)="deleteEditedPrompt()">Delete</button>
                <button class="btn btn-sm btn-outline-secondary" (click)="editingPrompt.set(null)">Close</button>
              </div>
            </div>
            <div class="card-body p-3">
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label small text-muted">Marketplace</label>
                  <select class="form-select form-select-sm" [value]="tpl.marketplace" (change)="updateEditedMarketplace($any($event.target).value)">@for (m of PROMPT_MARKETPLACES; track m) { <option [value]="m">{{ MARKETPLACE_LABELS[m] }}</option> }</select>
                </div>
                <div class="col-6">
                  <label class="form-label small text-muted">Category</label>
                  <select class="form-select form-select-sm" [value]="tpl.category" (change)="updateEditedCategory($any($event.target).value)">@for (c of PROMPT_CATEGORIES; track c) { <option [value]="c">{{ CATEGORY_LABELS[c] }}</option> }</select>
                </div>
              </div>
              <div class="mt-2">
                <label class="form-label small text-muted">Name</label>
                <input class="form-control form-control-sm" [value]="editName()" (input)="onEditNameInput($event)" />
              </div>
              <div class="mt-2">
                <label class="form-label small text-muted">Content</label>
                <div class="d-flex gap-1 flex-wrap mb-1">
                  @for (v of PROMPT_VARIABLES; track v) {
                    <button class="btn btn-sm btn-outline-info py-0 px-2" (click)="insertVariableToEdit(v)">{{ '{{' + v + '}}' }}</button>
                  }
                </div>
                <textarea class="form-control" rows="5" style="font-size:.82rem;font-family:monospace" [value]="editContent()" (input)="onEditContentInput($event)"></textarea>
              </div>
              <div class="mt-2">
                <label class="form-label small text-muted">Change Comment</label>
                <input class="form-control form-control-sm" [(ngModel)]="saveComment" placeholder="What changed?" />
              </div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-2 fw-semibold small">Preview</div>
                <div class="card-body p-3">
                  <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" id="showRawToggle2" [(ngModel)]="showRaw" />
                    <label class="form-check-label small" for="showRawToggle2">Show variables</label>
                  </div>
                  @if (showRaw()) {
                    <pre class="mb-0 small" style="white-space:pre-wrap">{{ editContent() || '(empty)' }}</pre>
                  } @else {
                    <div class="small" style="white-space:pre-wrap">{{ previewComputed() }}</div>
                  }
                </div>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-2 fw-semibold small">Test with AI</div>
                <div class="card-body p-3">
                  <div class="mb-2">
                    <label class="form-label small text-muted">Provider</label>
                    <select class="form-select form-select-sm" [(ngModel)]="testProviderType">
                      <option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="claude">Claude</option>
                      <option value="ollama">Ollama</option><option value="openrouter">OpenRouter</option><option value="azure-openai">Azure OpenAI</option>
                    </select>
                  </div>
                  <button class="btn btn-sm btn-primary" (click)="testPrompt()" [disabled]="testingPrompt()">{{ testingPrompt() ? 'Generating...' : 'Generate' }}</button>
                  @if (testResult()) {
                    <div class="mt-2 p-2 bg-light rounded small" style="white-space:pre-wrap;max-height:200px;overflow-y:auto">{{ testResult() }}</div>
                  }
                </div>
              </div>
            </div>
          </div>

          @if (tpl.versions.length) {
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 fw-semibold small">Version History ({{ tpl.versions.length }})</div>
              <div class="card-body p-0">
                @for (ver of tpl.versions.slice().reverse(); track ver.id) {
                  <div class="d-flex align-items-center gap-2 px-3 py-2 border-bottom small">
                    <span class="badge bg-secondary bg-opacity-10 text-secondary">v{{ ver.version }}</span>
                    <span class="text-muted">{{ formatDate(ver.createdAt) }}</span> @if (ver.comment) { <span class="text-muted">&mdash; {{ ver.comment }}</span> }
                    <div class="ms-auto d-flex gap-1">
                      <button class="btn btn-sm btn-link text-decoration-none py-0 px-1" (click)="restoreVersion(ver)">Restore</button>
                      <button class="btn btn-sm btn-link text-decoration-none py-0 px-1" (click)="compareVersion(ver)">Compare</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <div class="card border-0 shadow-sm">
            <div class="card-body text-center py-4">
              <p class="text-muted small mb-2">Select a prompt card above to edit, or create a new one.</p>
              <button class="btn btn-sm btn-outline-primary" (click)="createNewPrompt()">+ New Prompt</button>
            </div>
          </div>
        }

        @if (compareMode()) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-header bg-white py-2 fw-semibold small d-flex justify-content-between">
              <span>Version Comparison</span>
              <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" (click)="compareMode.set(null)">&times;</button>
            </div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0" style="font-size:.78rem">
                <thead class="table-light"><tr><th style="width:120px">Field</th><th>Version A</th><th>Version B</th></tr></thead>
                <tbody>
                  <tr><td class="fw-medium">Version</td><td>v{{ compareA()?.version }}</td><td>v{{ compareB()?.version }}</td></tr>
                  <tr><td class="fw-medium">Date</td><td>{{ formatDate(compareA()?.createdAt) }}</td><td>{{ formatDate(compareB()?.createdAt) }}</td></tr>
                  <tr><td class="fw-medium">Comment</td><td>{{ compareA()?.comment || '—' }}</td><td>{{ compareB()?.comment || '—' }}</td></tr>
                  <tr><td class="fw-medium">Content</td><td><pre class="mb-0 small" style="white-space:pre-wrap;max-height:150px;overflow-y:auto" [class.bg-warning]="(compareA()?.content)! !== (compareB()?.content)!">{{ compareA()?.content }}</pre></td><td><pre class="mb-0 small" style="white-space:pre-wrap;max-height:150px;overflow-y:auto" [class.bg-warning]="(compareA()?.content)! !== (compareB()?.content)!">{{ compareB()?.content }}</pre></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- =================== HISTORY =================== -->
      @if (tab() === 'history') {
        <div class="d-flex gap-2 mb-3 align-items-center">
          <span class="small fw-medium">Regeneration History</span>
          <span class="small text-muted">{{ versionHistory().length }} entries</span>
          @if (selectedForCompare().length === 2) {
            <button class="btn btn-sm btn-outline-info" (click)="openCompare()">Compare Selected</button>
            <button class="btn btn-sm btn-outline-secondary" (click)="selectedForCompare.set([])">Clear</button>
          }
        </div>

        @if (!versionHistory().length) {
          <div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
            <p class="text-muted small mb-0">No generation history yet.</p></div></div>
        } @else {
          <div class="table-responsive rounded border">
            <table class="table table-hover align-middle mb-0" style="font-size:.82rem">
              <thead class="table-light"><tr><th style="width:32px"></th><th>Type</th><th>Provider</th><th>Prompt</th><th>Fields</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                @for (v of versionHistory(); track v.id) {
                  <tr>
                    <td><input type="checkbox" class="form-check-input" [checked]="selectedForCompare().includes(v.id)" (change)="toggleCompareSelect(v.id)" /></td>
                    <td><span class="badge bg-info bg-opacity-10 text-info">{{ v.generationType }}</span></td>
                    <td>{{ v.providerLabel || v.provider }}</td>
                    <td class="small text-muted text-truncate" style="max-width:200px">{{ v.prompt.slice(0, 60) }}{{ (v.prompt.length > 60) ? '...' : '' }}</td>
                    <td class="small text-muted">{{ v.generatedFields.join(', ') || '-' }}</td>
                    <td class="small text-muted">{{ formatDate(v.createdAt) }}</td>
                    <td><span class="badge" [class]="v.approved ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'">{{ v.approved ? 'Approved' : 'Pending' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (compareResult(); as cr) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-header bg-white py-2 fw-semibold small d-flex justify-content-between">
              <span>Version Comparison</span>
              <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" (click)="compareResult.set(null)">&times;</button>
            </div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0" style="font-size:.78rem">
                <thead class="table-light"><tr><th>Field</th><th>Value A</th><th>Value B</th><th>Changed</th></tr></thead>
                <tbody>
                  @for (d of cr; track d.field) {
                    <tr [class.table-warning]="d.changed">
                      <td class="fw-medium">{{ d.field }}</td>
                      <td class="text-break small">{{ formatValue(d.valueA) }}</td>
                      <td class="text-break small">{{ formatValue(d.valueB) }}</td>
                      <td><span class="badge" [class]="d.changed ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'">{{ d.changed ? 'Yes' : 'No' }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- =================== LOGS =================== -->
      @if (tab() === 'logs') {
        <div class="d-flex gap-2 mb-3 align-items-center">
          <select class="form-select form-select-sm" style="width:auto" (change)="logTypeFilter.set($any($event.target).value)">
            <option value="">All Types</option> <option value="info">Info</option> <option value="success">Success</option> <option value="warning">Warning</option> <option value="error">Error</option>
            <option value="create">Create</option> <option value="update">Update</option> <option value="delete">Delete</option>
          </select>
          <span class="small text-muted">{{ filteredLogs().length }} entries</span>
        </div>

        @if (!filteredLogs().length) {
          <div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
            <p class="text-muted small mb-0">No AI logs yet.</p></div></div>
        } @else {
          <div class="table-responsive rounded border" style="max-height:500px;overflow-y:auto">
            <table class="table table-hover align-middle mb-0" style="font-size:.82rem">
              <thead class="table-light" style="position:sticky;top:0"><tr><th>Type</th><th>Message</th><th>Platform</th><th>Date</th><th>Details</th></tr></thead>
              <tbody>
                @for (log of filteredLogs(); track log.id) {
                  <tr>
                    <td><span class="badge" [class]="logBadgeClass(log.type)">{{ log.type }}</span></td>
                    <td class="small">{{ log.message }}</td>
                    <td><span class="badge bg-secondary bg-opacity-10 text-secondary">{{ log.platform || '—' }}</span></td>
                    <td class="small text-muted">{{ formatDate(log.createdAt) }}</td>
                    <td class="small text-muted text-truncate" style="max-width:150px">{{ log.details || '-' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;color:#666;white-space:nowrap;padding:.5rem .5rem}
    .table td{padding:.35rem .5rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AIManagementComponent implements OnInit {
  readonly promptSvc = inject(PromptManagementService);
  private readonly versionSvc = inject(VersionHistoryService);
  private readonly logSvc = inject(MarketplaceLogService);
  private readonly aiSettingsSvc = inject(AIProviderSettingsService);
  private readonly aiSvc = inject(AIService);
  private readonly aiTestingSvc = inject(AITestingService);

  readonly PROMPT_MARKETPLACES = PROMPT_MARKETPLACES;
  readonly PROMPT_CATEGORIES = PROMPT_CATEGORIES;
  readonly PROMPT_VARIABLES = PROMPT_VARIABLES;
  readonly MARKETPLACE_LABELS = PROMPT_MARKETPLACE_LABELS;
  readonly CATEGORY_LABELS = PROMPT_CATEGORY_LABELS;
  readonly PROVIDER_LABELS = PROVIDER_NAMES;

  readonly tab = signal<'overview' | 'prompts' | 'history' | 'logs'>('overview');
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly saving = signal(false);

  // Prompts
  readonly searchTerm = signal('');
  readonly filterMarketplace = signal('');
  readonly filterCategory = signal('');
  readonly editingPrompt = signal<PromptTemplate | null>(null);
  readonly editName = signal('');
  readonly editContent = signal('');
  readonly editMarketplace = signal<PromptMarketplace>('amazon');
  readonly editCategory = signal<PromptCategory>('title');
  readonly showRaw = signal(false);
  readonly saveComment = signal('');

  // Testing
  readonly testProviderType = signal<AIProviderType>('openai');
  readonly testingPrompt = signal(false);
  readonly testResult = signal<string | null>(null);

  // Compare
  readonly compareMode = signal<PromptTemplateVersion | null>(null);
  readonly compareA = signal<PromptTemplateVersion | null>(null);
  readonly compareB = signal<PromptTemplateVersion | null>(null);

  // History
  readonly selectedForCompare = signal<string[]>([]);
  readonly compareResult = signal<{ field: string; valueA: unknown; valueB: unknown; changed: boolean }[] | null>(null);

  // Logs
  readonly allLogs = signal<MarketplaceLog[]>([]);
  readonly logTypeFilter = signal('');

  // Provider health
  readonly testingProviders = signal<Record<string, boolean>>({});
  readonly providerTestResults = signal<Record<string, { ok: boolean; msg: string }>>({});

  readonly providerConfigs = computed(() => this.aiSettingsSvc.configs());

  readonly filteredPrompts = computed(() => {
    let list = this.promptSvc.templates();
    const term = this.searchTerm().toLowerCase();
    if (term) list = list.filter(t => t.name.toLowerCase().includes(term) || t.content.toLowerCase().includes(term));
    const mp = this.filterMarketplace();
    if (mp) list = list.filter(t => t.marketplace === mp);
    const cat = this.filterCategory();
    if (cat) list = list.filter(t => t.category === cat);
    return list;
  });

  readonly totalVersions = computed(() => {
    return this.promptSvc.templates().reduce((sum, t) => sum + t.versions.length, 0);
  });

  readonly versionHistory = computed(() => this.versionSvc.all());

  readonly totalGenerations = computed(() => this.versionHistory().length);

  readonly activeProviderLabel = computed(() => {
    const def = this.aiSettingsSvc.defaultProvider();
    if (def === 'none') return 'None';
    return PROVIDER_NAMES[def] || def;
  });

  readonly generationsByProvider = computed(() => {
    const count: Record<string, number> = {};
    for (const v of this.versionHistory()) {
      const p = v.provider || 'unknown';
      count[p] = (count[p] ?? 0) + 1;
    }
    return { labels: Object.keys(count).map(k => PROVIDER_NAMES[k] || k), data: Object.values(count) };
  });

  readonly costByProvider = computed(() => {
    const COST_PER_GEN: Record<string, number> = { openai: 0.002, gemini: 0.001, claude: 0.003, ollama: 0, openrouter: 0.002, 'azure-openai': 0.002 };
    const cost: Record<string, number> = {};
    for (const v of this.versionHistory()) {
      const p = v.provider || 'unknown';
      cost[p] = (cost[p] ?? 0) + (COST_PER_GEN[p] ?? 0.002);
    }
    return { labels: Object.keys(cost).map(k => PROVIDER_NAMES[k] || k), data: Object.values(cost) };
  });

  readonly previewComputed = computed(() => {
    return this.promptSvc.preview(this.editContent(), SAMPLE_VALUES);
  });

  readonly filteredLogs = computed(() => {
    let list = this.allLogs();
    const f = this.logTypeFilter();
    if (f) list = list.filter(l => l.type === f);
    return list;
  });

  ngOnInit(): void {
    this.loadLogs();
  }

  private async loadLogs(): Promise<void> {
    try {
      const result = await this.logSvc.getAll({ pageSize: 200, sortField: 'createdAt', sortDirection: 'desc' });
      this.allLogs.set(result.items);
    } catch { /* ignore */ }
  }

  selectPromptForEdit(tpl: PromptTemplate): void {
    this.editingPrompt.set(tpl);
    this.editName.set(tpl.name);
    this.editContent.set(tpl.content);
    this.editMarketplace.set(tpl.marketplace);
    this.editCategory.set(tpl.category);
    this.compareMode.set(null);
    this.compareA.set(null);
    this.compareB.set(null);
    this.testResult.set(null);
  }

  updateEditedMarketplace(val: string): void {
    this.editMarketplace.set(val as PromptMarketplace);
  }

  updateEditedCategory(val: string): void {
    this.editCategory.set(val as PromptCategory);
  }

  insertVariableToEdit(v: string): void {
    this.editContent.update(c => c + '{{' + v + '}}');
  }

  createNewPrompt(): void {
    const tpl: PromptTemplate = { id: crypto.randomUUID(), marketplace: 'amazon' as PromptMarketplace, category: 'title' as PromptCategory, name: 'New Prompt', content: '', variables: [...PROMPT_VARIABLES] as unknown as string[], version: 0, versions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: 'admin' };
    this.editingPrompt.set(tpl);
    this.editName.set('New Prompt');
    this.editContent.set('');
    this.editMarketplace.set('amazon');
    this.editCategory.set('title');
    this.testResult.set(null);
  }

  saveEditedPrompt(): void {
    const tpl = this.editingPrompt();
    if (!tpl) return;
    this.saving.set(true);
    try {
      const updated: PromptTemplate = {
        ...tpl,
        name: this.editName() || tpl.name,
        content: this.editContent(),
        marketplace: this.editMarketplace(),
        category: this.editCategory(),
        version: tpl.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
        versions: [...tpl.versions, {
          id: crypto.randomUUID(),
          content: this.editContent(),
          version: tpl.version + 1,
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
          comment: this.saveComment() || `Updated via AI Management`,
        }],
      };
      this.promptSvc.saveTemplate(updated, this.saveComment() || 'Updated via AI Management');
      this.editingPrompt.set(updated);
      this.successMessage.set('Prompt saved.');
      this.saveComment.set('');
    } catch (e: any) {
      this.error.set(e?.message || 'Save failed');
    } finally {
      this.saving.set(false);
    }
  }

  deleteEditedPrompt(): void {
    const tpl = this.editingPrompt();
    if (!tpl) return;
    try {
      this.promptSvc.deleteTemplate(tpl.id);
      this.editingPrompt.set(null);
      this.successMessage.set('Prompt deleted.');
    } catch (e: any) {
      this.error.set(e?.message || 'Delete failed');
    }
  }

  restoreVersion(ver: PromptTemplateVersion): void {
    const tpl = this.editingPrompt();
    if (!tpl) return;
    this.editContent.set(ver.content);
    this.successMessage.set(`Restored to v${ver.version}. Save to persist.`);
  }

  compareVersion(ver: PromptTemplateVersion): void {
    const tpl = this.editingPrompt();
    if (!tpl) return;
    if (!this.compareA()) {
      this.compareA.set(ver);
    } else if (!this.compareB() && this.compareA()?.id !== ver.id) {
      this.compareB.set(ver);
    } else {
      this.compareA.set(ver);
      this.compareB.set(null);
    }
    this.compareMode.set(ver);
  }

  async testPrompt(): Promise<void> {
    this.testingPrompt.set(true);
    this.testResult.set(null);
    try {
      const config = this.aiSettingsSvc.getConfig(this.testProviderType());
      if (config?.enabled) {
        this.aiSvc.configure({ provider: this.testProviderType(), model: config.model, temperature: config.temperature ?? 0.7, maxTokens: config.maxTokens ?? 1024, apiKey: config.apiKey, apiEndpoint: config.endpoint });
      } else {
        this.aiSvc.configure({ provider: this.testProviderType(), model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024 });
      }
      const prompt = this.promptSvc.preview(this.editContent(), SAMPLE_VALUES) || this.editContent();
      const result = await this.aiSvc.generate(prompt, { temperature: 0.7 }).toPromise();
      this.testResult.set(result?.text || 'No response');
    } catch (e: any) {
      this.testResult.set('Error: ' + (e?.message || 'Unknown'));
    } finally {
      this.testingPrompt.set(false);
    }
  }

  async testProvider(provider: AIProviderType): Promise<void> {
    this.testingProviders.update(p => ({ ...p, [provider]: true }));
    try {
      const result = await this.aiSettingsSvc.testConnection(provider).toPromise();
      this.providerTestResults.update(r => ({ ...r, [provider]: { ok: true, msg: result || 'Connected' } }));
    } catch (e: any) {
      this.providerTestResults.update(r => ({ ...r, [provider]: { ok: false, msg: e?.message || 'Failed' } }));
    } finally {
      this.testingProviders.update(p => ({ ...p, [provider]: false }));
    }
  }

  mpLabel(mp: string): string {
    return (this.MARKETPLACE_LABELS as Record<string, string>)[mp] || mp;
  }

  catLabel(cat: string): string {
    return (this.CATEGORY_LABELS as Record<string, string>)[cat] || cat;
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onEditNameInput(event: Event): void {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  onEditContentInput(event: Event): void {
    this.editContent.set((event.target as HTMLTextAreaElement).value);
  }

  toggleCompareSelect(id: string): void {
    this.selectedForCompare.update(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 2) return [id];
      return [...s, id];
    });
  }

  openCompare(): void {
    const ids = this.selectedForCompare();
    if (ids.length !== 2) return;
    const a = this.versionSvc.get(ids[0]);
    const b = this.versionSvc.get(ids[1]);
    if (!a || !b) return;
    const diffs = this.versionSvc.compare(a.id, b.id);
    this.compareResult.set(diffs);
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return '-';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatValue(v: unknown): string {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  logBadgeClass(type: string): string {
    const m: Record<string, string> = { info: 'bg-info bg-opacity-10 text-info', success: 'bg-success bg-opacity-10 text-success', warning: 'bg-warning bg-opacity-10 text-warning', error: 'bg-danger bg-opacity-10 text-danger', create: 'bg-success bg-opacity-10 text-success', update: 'bg-info bg-opacity-10 text-info', delete: 'bg-danger bg-opacity-10 text-danger' };
    return m[type] || 'bg-secondary bg-opacity-10 text-secondary';
  }
}
