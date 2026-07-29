import { Injectable, signal, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AIProviderFactory } from './ai/ai-provider-factory';
import { AIProviderType, AISettings, DEFAULT_AI_SETTINGS } from './ai/ai-settings.model';
import type { IAIProvider, GenerateOptions, GenerateResponse } from './ai/iai-provider';

@Injectable({ providedIn: 'root' })
export class AIService {
  private readonly factory = inject(AIProviderFactory);

  private settings = signal<AISettings>(DEFAULT_AI_SETTINGS);
  private provider = signal<IAIProvider | null>(null);
  private _configured = signal(false);

  readonly currentSettings = this.settings.asReadonly();
  readonly currentProvider = this.provider.asReadonly();
  readonly ready = this._configured.asReadonly();

  configure(settings: AISettings): void {
    this.settings.set(settings);
    try {
      const instance = this.factory.createProvider(settings);
      instance.configure(settings);
      this.provider.set(instance);
      this._configured.set(true);
    } catch {
      this._configured.set(false);
    }
  }

  reset(): void {
    this.settings.set(DEFAULT_AI_SETTINGS);
    this.provider.set(null);
    this._configured.set(false);
  }

  isAIEnabled(): boolean {
    return this.settings().provider !== 'none';
  }

  isConfigured(): boolean {
    return this._configured() && (this.provider()?.isConfigured() ?? false);
  }

  getProviderType(): AIProviderType {
    return this.settings().provider;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    const p = this.provider();
    if (!p) return throwError(() => new Error('AI provider not configured. Call configure() first.'));
    if (!p.isConfigured()) return throwError(() => new Error(`${p.name} provider is missing required configuration.`));
    return p.generate(prompt, options);
  }
}
