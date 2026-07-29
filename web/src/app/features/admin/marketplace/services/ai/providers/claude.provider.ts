import { Observable } from 'rxjs';
import type { IAIProvider, GenerateOptions, GenerateResponse } from '../iai-provider';
import type { AISettings } from '../ai-settings.model';

export class ClaudeProvider implements IAIProvider {
  readonly name = 'claude';
  private settings: AISettings | null = null;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  configure(settings: AISettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return !!this.settings?.apiKey;
  }

  getSettings(): AISettings {
    if (!this.settings) throw new Error('Claude provider not configured');
    return this.settings;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>(sub => {
      const s = this.settings!;
      const model = options?.model || s.model || 'claude-3-haiku-20240307';
      const content: any[] = [{ type: 'text', text: prompt }];
      if (options?.images?.length) {
        for (const uri of options.images) {
          const data = uri.split(',')[1] || uri;
          content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
        }
      }
      fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'x-api-key': s.apiKey!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: options?.maxTokens ?? s.maxTokens, temperature: options?.temperature ?? s.temperature, messages: [{ role: 'user', content }] }),
      })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || `HTTP ${r.status}`))); return r.json(); })
      .then(d => { const t = d.content?.[0]?.text ?? ''; sub.next({ text: t, model }); sub.complete(); })
      .catch(e => sub.error(e));
    });
  }
}
