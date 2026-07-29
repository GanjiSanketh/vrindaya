import { Observable } from 'rxjs';
import type { IAIProvider, GenerateOptions, GenerateResponse } from '../iai-provider';
import type { AISettings } from '../ai-settings.model';

export class OllamaProvider implements IAIProvider {
  readonly name = 'ollama';
  private settings: AISettings | null = null;

  configure(settings: AISettings): void {
    this.settings = settings;
  }

  isConfigured(): boolean {
    return !!this.settings?.apiEndpoint;
  }

  getSettings(): AISettings {
    if (!this.settings) throw new Error('Ollama provider not configured');
    return this.settings;
  }

  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse> {
    return new Observable<GenerateResponse>(sub => {
      const s = this.settings!;
      const model = options?.model || s.model || 'llama3';
      const endpoint = (s.apiEndpoint || 'http://localhost:11434').replace(/\/$/, '');
      const body: Record<string, any> = { model, prompt, stream: false, options: { temperature: options?.temperature ?? s.temperature } };
      if (options?.images?.length) {
        body['images'] = options.images.map(u => (u.split(',')[1] || u));
      }
      fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))); return r.json(); })
      .then(d => { sub.next({ text: d.response, model }); sub.complete(); })
      .catch(e => sub.error(e));
    });
  }
}
