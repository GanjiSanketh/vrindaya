import { Observable } from 'rxjs';
import type { IAIProvider, GenerateOptions, GenerateResponse } from '../iai-provider';
import type { AISettings } from '../ai-settings.model';
import { buildContent } from './shared';

export class OpenRouterProvider implements IAIProvider {
  readonly name = 'openrouter';
  private settings: AISettings | null = null;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  configure(settings: AISettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return !!this.settings?.apiKey;
  }

  getSettings(): AISettings {
    if (!this.settings) throw new Error('OpenRouter provider not configured');
    return this.settings;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>(sub => {
      const s = this.settings!;
      const model = options?.model || s.model || 'openai/gpt-4o-mini';
      const messages: any[] = [{ role: 'user', content: buildContent(prompt, options?.images) }];
      fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: options?.temperature ?? s.temperature, max_tokens: options?.maxTokens ?? s.maxTokens }),
      })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || `HTTP ${r.status}`))); return r.json(); })
      .then(d => { sub.next({ text: d.choices[0].message.content, model: d.model, usage: d.usage ? { promptTokens: d.usage.prompt_tokens, completionTokens: d.usage.completion_tokens, totalTokens: d.usage.total_tokens } : undefined }); sub.complete(); })
      .catch(e => sub.error(e));
    });
  }
}


