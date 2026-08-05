import { Injectable, signal } from '@angular/core';
import { AiProvider, ProviderHealth, ProviderType } from '../models/ai-provider.model';

const STORAGE_KEY = 'vrindaya_ai_providers';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function seed(): AiProvider[] {
  const now = new Date().toISOString();
  const mk = (
    name: string, icon: string, color: string, type: ProviderType,
    priority: number, model: string, baseUrl: string, key: string,
    health: ProviderHealth, responseTime: number, costPer1k: number,
  ): AiProvider => ({
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name, icon, color, type, priority,
    enabled: true,
    allowFallback: type === 'cloud',
    baseUrl, apiKey: key, defaultModel: model,
    health, responseTime, costPer1k,
    lastChecked: now,
  });

  return [
    mk('OpenAI', 'bi-robot', '#10a37f', 'cloud', 1, 'gpt-4o', 'https://api.openai.com/v1', 'sk-••••••••••••••', 'healthy', 320, 0.005),
    mk('Gemini', 'bi-gem', '#4285f4', 'cloud', 2, 'gemini-1.5-pro', 'https://generativelanguage.googleapis.com', 'AIza••••••••••••', 'healthy', 410, 0.001),
    mk('Claude', 'bi-stars', '#d97757', 'cloud', 3, 'claude-3-5-sonnet', 'https://api.anthropic.com/v1', '••••••••••••••••', 'degraded', 520, 0.009),
    mk('OpenRouter', 'bi-shuffle', '#7c3aed', 'cloud', 4, 'auto', 'https://openrouter.ai/api/v1', 'sk-or-••••••••', 'degraded', 700, 0.004),
    mk('Ollama', 'bi-laptop', '#6b7280', 'local', 5, 'llama3', 'http://localhost:11434', '', 'healthy', 180, 0),
    mk('LM Studio', 'bi-cpu', '#0ea5e9', 'local', 6, 'local-model', 'http://localhost:1234/v1', '', 'healthy', 150, 0),
  ];
}

@Injectable({ providedIn: 'root' })
export class AiProviderService {
  readonly providers = signal<AiProvider[]>(this.load());

  private load(): AiProvider[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AiProvider[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return seed();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.providers())); } catch { /* ignore */ }
  }

  update(id: string, patch: Partial<AiProvider>): void {
    this.providers.update(list => list.map(p => (p.id === id ? { ...p, ...patch } : p)));
    this.persist();
  }

  movePriority(id: string, delta: number): void {
    this.providers.update(list => {
      const idx = list.findIndex(p => p.id === id);
      const next = idx + delta;
      if (idx < 0 || next < 0 || next >= list.length) return list;
      const copy = [...list];
      const cur = copy[idx];
      const other = copy[next];
      copy[idx] = { ...cur, priority: other.priority };
      copy[next] = { ...other, priority: cur.priority };
      return copy;
    });
    this.persist();
  }

  runHealthCheck(): void {
    const now = new Date().toISOString();
    this.providers.update(list =>
      list.map(p => {
        const roll = Math.random();
        const health: AiProvider['health'] = roll < 0.8 ? 'healthy' : roll < 0.96 ? 'degraded' : 'down';
        const base = p.type === 'local' ? 120 : 300;
        const jitter = Math.round(Math.random() * 480);
        return { ...p, health, responseTime: base + jitter, lastChecked: now };
      }),
    );
    this.persist();
  }

  addCustom(draft: Omit<AiProvider, 'id' | 'priority' | 'enabled' | 'allowFallback' | 'health' | 'responseTime' | 'costPer1k' | 'lastChecked'>): void {
    const max = Math.max(0, ...this.providers().map(p => p.priority));
    const provider: AiProvider = {
      ...draft,
      id: uid(),
      priority: max + 1,
      enabled: true,
      allowFallback: true,
      health: 'degraded',
      responseTime: 0,
      costPer1k: 0,
      lastChecked: new Date().toISOString(),
    };
    this.providers.update(list => [...list, provider]);
    this.persist();
  }

  removeCustom(id: string): void {
    this.providers.update(list => list.filter(p => !(p.id === id && p.type === 'custom')));
    this.persist();
  }

  reset(): void {
    this.providers.set(seed());
    this.persist();
  }
}