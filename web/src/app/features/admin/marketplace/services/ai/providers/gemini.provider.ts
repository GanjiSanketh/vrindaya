import { Observable } from 'rxjs';
import type { IAIProvider, GenerateOptions, GenerateResponse } from '../iai-provider';
import type { AISettings } from '../ai-settings.model';

export class GeminiProvider implements IAIProvider {
  readonly name = 'gemini';
  private settings: AISettings | null = null;

  configure(settings: AISettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return !!this.settings?.apiKey;
  }

  getSettings(): AISettings {
    if (!this.settings) throw new Error('Gemini provider not configured');
    return this.settings;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>(sub => {
      const s = this.settings!;
      const model = options?.model || s.model || 'gemini-1.5-flash';
      const apiKey = s.apiKey!;
      const parts: any[] = [{ text: prompt }];
      if (options?.images?.length) {
        for (const uri of options.images) {
          const data = uri.split(',')[1] || uri;
          parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
        }
      }
      fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: options?.temperature ?? s.temperature, maxOutputTokens: options?.maxTokens ?? s.maxTokens },
        }),
      })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || `HTTP ${r.status}`))); return r.json(); })
      .then(d => { const t = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''; sub.next({ text: t, model }); sub.complete(); })
      .catch(e => sub.error(e));
    });
  }
}
