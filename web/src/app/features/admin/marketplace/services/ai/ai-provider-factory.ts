import { Injectable } from '@angular/core';
import type { IAIProvider } from './iai-provider';
import type { AISettings } from './ai-settings.model';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';

@Injectable({ providedIn: 'root' })
export class AIProviderFactory {
  createProvider(settings: AISettings): IAIProvider {
    switch (settings.provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'claude':
        return new ClaudeProvider();
      case 'ollama':
        return new OllamaProvider();
      case 'openrouter':
        return new OpenRouterProvider();
      case 'azure-openai':
        return new AzureOpenAIProvider();
      default:
        throw new Error(`Unknown AI provider: ${settings.provider}`);
    }
  }
}
