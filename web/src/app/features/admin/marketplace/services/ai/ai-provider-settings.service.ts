import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AIProviderFactory } from './ai-provider-factory';
import { AIService } from '../ai.service';
import {
  AIProviderType, AIProviderConfig, AIProvidersSettings,
  ALL_PROVIDERS, createDefaultProviderConfig, STORAGE_KEY,
} from './ai-settings.model';
import type { GenerateResponse } from './iai-provider';

const STORAGE_TEMP_KEY = 'vrindaya_ai_test_temp';

@Injectable({ providedIn: 'root' })
export class AIProviderSettingsService {
  private readonly factory = inject(AIProviderFactory);
  private readonly ai = inject(AIService);

  readonly configs = signal<AIProviderConfig[]>([]);
  readonly defaultProvider = signal<AIProviderType>('none');
  readonly loaded = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AIProvidersSettings = JSON.parse(raw);
        this.configs.set(parsed.providers);
        this.defaultProvider.set(parsed.defaultProvider);
      } else {
        this.configs.set(ALL_PROVIDERS.map(p => createDefaultProviderConfig(p)));
        this.defaultProvider.set('none');
      }
    } catch {
      this.configs.set(ALL_PROVIDERS.map(p => createDefaultProviderConfig(p)));
      this.defaultProvider.set('none');
    }
    this.loaded.set(true);
  }

  save(): void {
    const data: AIProvidersSettings = {
      providers: this.configs(),
      defaultProvider: this.defaultProvider(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getConfig(provider: AIProviderType): AIProviderConfig | undefined {
    return this.configs().find(c => c.provider === provider);
  }

  updateConfig(provider: AIProviderType, partial: Partial<AIProviderConfig>): void {
    this.configs.update(configs =>
      configs.map(c => c.provider === provider ? { ...c, ...partial } : c)
    );
  }

  setDefault(type: AIProviderType): void {
    this.defaultProvider.set(type);
  }

  applyToAIService(): boolean {
    const def = this.defaultProvider();
    if (def === 'none') return false;
    const cfg = this.getConfig(def);
    if (!cfg?.enabled) return false;
    this.ai.configure({
      provider: def,
      apiKey: cfg.apiKey,
      apiEndpoint: cfg.endpoint,
      model: cfg.model,
      visionModel: cfg.visionModel,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
    });
    return true;
  }

  /** Test connection by making a real API call. Never logs the key. */
  testConnection(provider: AIProviderType): Observable<string> {
    const cfg = this.getConfig(provider);
    if (!cfg) return new Observable(sub => { sub.error(new Error('No configuration found for this provider.')); });

    return new Observable<string>(sub => {
      let settings: any;
      if (provider === 'ollama') {
        settings = { provider, model: cfg.model, temperature: 0.1, maxTokens: 50, apiEndpoint: cfg.endpoint || 'http://localhost:11434' };
      } else if (provider === 'azure-openai') {
        settings = { provider, model: cfg.model, apiKey: cfg.apiKey, apiEndpoint: cfg.endpoint, temperature: 0.1, maxTokens: 50 };
      } else {
        settings = { provider, model: cfg.model, apiKey: cfg.apiKey, apiEndpoint: cfg.endpoint, temperature: 0.1, maxTokens: 50 };
      }
      const instance = this.factory.createProvider(settings);
      instance.configure(settings);

      if (!instance.isConfigured()) {
        sub.error(new Error('Provider is missing required configuration (API key or endpoint).'));
        return;
      }

      localStorage.setItem(STORAGE_TEMP_KEY, JSON.stringify(settings));

      instance.generate('Respond with only the word CONNECTED if you can read this.').subscribe({
        next: (res: GenerateResponse) => {
          localStorage.removeItem(STORAGE_TEMP_KEY);
          sub.next(res.text.trim());
          sub.complete();
        },
        error: (err: any) => {
          localStorage.removeItem(STORAGE_TEMP_KEY);
          sub.error(err);
        },
      });
    });
  }

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.configs.set(ALL_PROVIDERS.map(p => createDefaultProviderConfig(p)));
    this.defaultProvider.set('none');
  }
}
