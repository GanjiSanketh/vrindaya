import { Injectable } from '@angular/core';
import { OpenRouterProviderService } from './openrouter/openrouter-provider.service';

export interface Provider {
  id: string;
  name: string;
  models: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ProviderManagerService {
  private providers: Provider[] = [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      models: ['openrouter/auto', 'openrouter/sonoma-sky-alpha', 'openrouter/sonoma-dusk-alpha'],
    },
    {
      id: 'gemini',
      name: 'Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    },
    {
      id: 'groq',
      name: 'Groq',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    },
    {
      id: 'ollama',
      name: 'Ollama',
      models: ['llama3.2', 'llama3.1', 'mistral', 'codellama'],
    },
  ];

  private currentProviderId = 'openrouter';

  constructor(private openRouterProvider: OpenRouterProviderService) {}

  execute(prompt: string, model?: string): Promise<string> {
    return this.openRouterProvider.executePrompt(prompt);
  }

  getAvailableProviders(): Provider[] {
    return [...this.providers];
  }

  getCurrentProvider(): Provider {
    return this.providers.find(p => p.id === this.currentProviderId) || this.providers[0];
  }

  setCurrentProvider(providerId: string): void {
    if (this.providers.some(p => p.id === providerId)) {
      this.currentProviderId = providerId;
    }
  }
}