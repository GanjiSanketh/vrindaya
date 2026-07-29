import { Observable } from 'rxjs';
import type { IAIProvider, GenerateOptions, GenerateResponse } from '../iai-provider';
import type { AISettings } from '../ai-settings.model';
import { buildContent } from './shared';

export class AzureOpenAIProvider implements IAIProvider {
  readonly name = 'azure-openai';
  private settings: AISettings | null = null;

  configure(settings: AISettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return !!(this.settings?.apiKey && this.settings?.apiEndpoint);
  }

  getSettings(): AISettings {
    if (!this.settings) throw new Error('Azure OpenAI provider not configured');
    return this.settings;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>(sub => {
      const s = this.settings!;
      const model = options?.model || s.model || 'gpt-4o-mini';
      const endpoint = s.apiEndpoint!.replace(/\/$/, '');
      const messages: any[] = [{ role: 'user', content: buildContent(prompt, options?.images) }];
      fetch(`${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: { 'api-key': s.apiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, temperature: options?.temperature ?? s.temperature, max_tokens: options?.maxTokens ?? s.maxTokens }),
      })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || `HTTP ${r.status}`))); return r.json(); })
      .then(d => { sub.next({ text: d.choices[0].message.content, model }); sub.complete(); })
      .catch(e => sub.error(e));
    });
  }
}


