import { Observable } from 'rxjs';
import type { AISettings } from './ai-settings.model';

export interface GenerateOptions {
  temperature?: number;
  model?: string;
  maxTokens?: number;
  images?: string[];
}

export interface GenerateResponse {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface IAIProvider {
  readonly name: string;
  configure(settings: AISettings): void;
  isConfigured(): boolean;
  getSettings(): AISettings;
  generate(prompt: string, options?: GenerateOptions): Observable<GenerateResponse>;
}
