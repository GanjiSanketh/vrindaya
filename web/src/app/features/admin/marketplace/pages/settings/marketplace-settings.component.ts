import { Component, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { AIProviderSettingsService } from '../../services/ai/ai-provider-settings.service';
import { AIService } from '../../services/ai.service';
import { AIProviderType, AIProviderConfig, ALL_PROVIDERS, providerLabel } from '../../services/ai/ai-settings.model';

interface ProviderMeta { type: AIProviderType; label: string; accent: string; icon: string; docUrl: string }

const PROVIDER_META: ProviderMeta[] = [
  { type: 'openai', label: 'OpenAI', accent: '#00A67E', icon: 'O', docUrl: 'https://platform.openai.com/api-keys',
    /* SVG path for OpenAI-style mark */
  },
  { type: 'gemini', label: 'Gemini', accent: '#4285F4', icon: 'G', docUrl: 'https://ai.google.dev/' },
  { type: 'claude', label: 'Claude', accent: '#D97757', icon: 'C', docUrl: 'https://console.anthropic.com/' },
  { type: 'ollama', label: 'Ollama', accent: '#000', icon: 'Ol', docUrl: 'https://ollama.com/' },
  { type: 'openrouter', label: 'OpenRouter', accent: '#8B5CF6', icon: 'OR', docUrl: 'https://openrouter.ai/keys' },
  { type: 'azure-openai', label: 'Azure OpenAI', accent: '#0078D4', icon: 'Az', docUrl: 'https://portal.azure.com/' },
];

@Component({
  selector: 'app-marketplace-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="AI Provider Settings" subtitle="Configure, enable, and test AI provider connections.">
      <div actions class="d-flex gap-2 align-items-center">
        @if (saved()) { <span class="badge bg-success bg-opacity-10 text-success px-3 py-2">Saved</span> }
        @if (hasActiveProvider()) {
          <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
            Active: {{ activeLabel() }}
          </span>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">
          {{ error() }}
          <button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button>
        </div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">
          {{ successMessage() }}
          <button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button>
        </div>
      }

      <!-- Provider Cards -->
      <div class="row g-3 mb-4">
        @for (meta of providerMeta; track meta.type) {
          @let cfg = getConfig(meta.type);
          @let selected = selectedType() === meta.type;
          @let enabled = cfg?.enabled ?? false;
          @let configured = isConfigured(meta.type);
          <div class="col-6 col-md-4 col-lg-2">
            <div class="provider-card" [class.selected]="selected" [class.enabled]="enabled" (click)="selectProvider(meta.type)">
              <div class="provider-icon" [style.background]="meta.accent">{{ meta.icon }}</div>
              <div class="provider-name">{{ meta.label }}</div>
              <div class="provider-status">
                @if (enabled) {
                  <span class="badge bg-success bg-opacity-10 text-success">Enabled</span>
                } @else {
                  <span class="badge bg-secondary bg-opacity-10 text-secondary">Disabled</span>
                }
              </div>
              @if (configured && enabled) {
                <div class="configured-check">&#10003;</div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Config Panel -->
      @if (selectedConfig(); as cfg) {
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
            <span class="fw-semibold">{{ cfg.label }} Configuration</span>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="enableToggle" [checked]="cfg.enabled" (change)="toggleEnabled(cfg.provider)" />
              <label class="form-check-label small" for="enableToggle">{{ cfg.enabled ? 'Enabled' : 'Disabled' }}</label>
            </div>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <!-- API Key -->
              <div class="col-12 col-md-6">
                <label class="form-label small fw-medium text-muted">API Key</label>
                <div class="input-group input-group-sm">
                  <input [type]="showKey() ? 'text' : 'password'" class="form-control" placeholder="sk-..." [value]="cfg.apiKey" (input)="updateField(cfg.provider, 'apiKey', $event)" autocomplete="off" />
                  <button class="btn btn-outline-secondary" type="button" (click)="toggleKey()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <!-- Endpoint -->
              <div class="col-12 col-md-6">
                <label class="form-label small fw-medium text-muted">Endpoint</label>
                <input class="form-control form-control-sm" placeholder="https://..." [value]="cfg.endpoint" (input)="updateField(cfg.provider, 'endpoint', $event)" />
              </div>
              <!-- Model -->
              <div class="col-6 col-md-3">
                <label class="form-label small fw-medium text-muted">Model</label>
                <input class="form-control form-control-sm" placeholder="gpt-4o-mini" [value]="cfg.model" (input)="updateField(cfg.provider, 'model', $event)" />
              </div>
              <!-- Vision Model -->
              <div class="col-6 col-md-3">
                <label class="form-label small fw-medium text-muted">Vision Model</label>
                <input class="form-control form-control-sm" placeholder="gpt-4o" [value]="cfg.visionModel" (input)="updateField(cfg.provider, 'visionModel', $event)" />
              </div>
              <!-- Temperature -->
              <div class="col-4 col-md-2">
                <label class="form-label small fw-medium text-muted">Temperature</label>
                <input type="number" class="form-control form-control-sm" min="0" max="2" step="0.1" [value]="cfg.temperature" (input)="updateFieldNum(cfg.provider, 'temperature', $event)" />
              </div>
              <!-- Max Tokens -->
              <div class="col-4 col-md-2">
                <label class="form-label small fw-medium text-muted">Max Tokens</label>
                <input type="number" class="form-control form-control-sm" min="1" step="1" [value]="cfg.maxTokens" (input)="updateFieldNum(cfg.provider, 'maxTokens', $event)" />
              </div>
              <!-- Timeout -->
              <div class="col-4 col-md-2">
                <label class="form-label small fw-medium text-muted">Timeout (ms)</label>
                <input type="number" class="form-control form-control-sm" min="1000" step="1000" [value]="cfg.timeout" (input)="updateFieldNum(cfg.provider, 'timeout', $event)" />
              </div>
              <!-- Doc link -->
              <div class="col-12">
                <a [href]="docUrl(cfg.provider)" target="_blank" class="small text-decoration-none" rel="noopener">Get API key &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Default Provider & Actions -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body p-3">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label small fw-medium text-muted">Default Provider</label>
              <select class="form-select form-select-sm" [value]="defaultType()" (change)="setDefault($event)">
                <option value="none">-- None (AI disabled) --</option>
                @for (meta of providerMeta; track meta.type) {
                  <option [value]="meta.type" [disabled]="!getConfig(meta.type)?.enabled">{{ meta.label }}</option>
                }
              </select>
            </div>
            <div class="col-md-8 d-flex gap-2 justify-content-md-end">
              <button class="btn btn-sm btn-outline-danger" (click)="resetAll()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                Reset All
              </button>
              <button class="btn btn-sm btn-success" (click)="saveConfig()" [disabled]="saving()">
                @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> Saving... }
                @else { <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save & Apply }
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Connection -->
      @if (selectedConfig(); as cfg) {
        <div class="card border-0 shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0 fw-semibold" style="font-size:.85rem">Test Connection</h6>
              <button class="btn btn-sm btn-outline-primary" (click)="testConnection()" [disabled]="testing() || !cfg.enabled">
                @if (testing()) { <span class="spinner-border spinner-border-sm me-1"></span> Testing... }
                @else { <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Test Connection }
              </button>
            </div>
            @if (testResult(); as tr) {
              <div class="d-flex align-items-center gap-2 small" [class]="testOk() ? 'text-success' : 'text-danger'">
                @if (testOk()) {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                }
                {{ tr }}
              </div>
            }
          </div>
        </div>
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .provider-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1rem .75rem;
      text-align: center;
      cursor: pointer;
      transition: all .2s ease;
      position: relative;
    }
    .provider-card:hover { border-color: #c0c4cc; background: #fafbfc; }
    .provider-card.selected { border-color: #4a90d9; background: #f0f4ff; box-shadow: 0 0 0 3px rgba(74,144,217,.12); }
    .provider-card.enabled { border-color: #198754; }
    .provider-card.enabled.selected { border-color: #4a90d9; }
    .provider-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto .4rem;
      color: #fff; font-weight: 700; font-size: .85rem;
    }
    .provider-name { font-size: .82rem; font-weight: 600; color: #1a1a2e; margin-bottom: .25rem; }
    .provider-status { font-size: .68rem; }
    .configured-check {
      position: absolute; top: 6px; right: 8px;
      background: #198754; color: #fff; width: 18px; height: 18px;
      border-radius: 50%; font-size: .65rem; line-height: 18px; text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceSettingsComponent {
  private readonly settingsSvc = inject(AIProviderSettingsService);
  private readonly ai = inject(AIService);

  readonly providerMeta = PROVIDER_META;
  readonly defaultType = this.settingsSvc.defaultProvider;
  readonly selectedType = signal<AIProviderType | null>(null);
  readonly showKey = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly testing = signal(false);
  readonly testResult = signal<string | null>(null);
  readonly testOk = signal(false);
  readonly error = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  readonly successMessage = signal<string | null>(null);

  selectedConfig = computed(() => {
    const type = this.selectedType();
    return type ? this.settingsSvc.getConfig(type) ?? null : null;
  });

  hasActiveProvider = computed(() => {
    const def = this.defaultType();
    if (def === 'none') return false;
    const cfg = this.settingsSvc.getConfig(def);
    return !!cfg?.enabled;
  });

  activeLabel = computed(() => {
    const def = this.defaultType();
    return def !== 'none' ? providerLabel(def) : '';
  });

  getConfig(type: AIProviderType): AIProviderConfig | undefined {
    return this.settingsSvc.getConfig(type);
  }

  isConfigured(type: AIProviderType): boolean {
    const cfg = this.settingsSvc.getConfig(type);
    if (!cfg || !cfg.enabled) return false;
    if (type === 'ollama') return !!cfg.endpoint;
    if (type === 'azure-openai') return !!cfg.apiKey && !!cfg.endpoint;
    return !!cfg.apiKey;
  }

  docUrl(type: AIProviderType): string {
    return PROVIDER_META.find(m => m.type === type)?.docUrl ?? '';
  }

  selectProvider(type: AIProviderType): void {
    this.selectedType.set(type);
    this.testResult.set(null);
    this.showKey.set(false);
  }

  toggleEnabled(type: AIProviderType): void {
    const cfg = this.settingsSvc.getConfig(type);
    if (cfg) this.settingsSvc.updateConfig(type, { enabled: !cfg.enabled });
    if (this.selectedType() === type) {
      this.testResult.set(null);
    }
    this.saved.set(false);
  }

  toggleKey(): void {
    this.showKey.update(v => !v);
  }

  updateField(type: AIProviderType, field: keyof AIProviderConfig, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.settingsSvc.updateConfig(type, { [field]: val } as any);
    this.saved.set(false);
  }

  updateFieldNum(type: AIProviderType, field: keyof AIProviderConfig, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.settingsSvc.updateConfig(type, { [field]: val } as any);
      this.saved.set(false);
    }
  }

  setDefault(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as AIProviderType;
    this.settingsSvc.setDefault(val);
    this.saved.set(false);
  }

  saveConfig(): void {
    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);
    try {
      this.settingsSvc.save();
      const applied = this.settingsSvc.applyToAIService();
      this.saved.set(true);
      this.successMessage.set(applied
        ? 'Configuration saved and applied. Default provider is now active.'
        : 'Configuration saved. Enable a provider and set it as default to activate AI.'
      );
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to save configuration.');
    } finally {
      this.saving.set(false);
    }
  }

  testConnection(): void {
    const type = this.selectedType();
    if (!type) return;
    this.testing.set(true);
    this.testResult.set(null);
    this.error.set(null);

    this.settingsSvc.testConnection(type).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.testResult.set(res === 'CONNECTED' ? 'Connection successful.' : `Unexpected response: ${res}`);
        this.testOk.set(res === 'CONNECTED');
        this.testing.set(false);
      },
      error: (err) => {
        this.testResult.set(`Failed: ${err?.message || 'Unknown error'}`);
        this.testOk.set(false);
        this.testing.set(false);
      },
    });
  }

  resetAll(): void {
    this.settingsSvc.resetAll();
    this.ai.reset();
    this.selectedType.set(null);
    this.testResult.set(null);
    this.saved.set(false);
    this.error.set(null);
    this.successMessage.set('All provider settings have been reset.');
  }
}
