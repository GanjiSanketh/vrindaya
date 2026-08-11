import { Injectable } from '@angular/core';
import { OpenRouterProviderService } from './openrouter/openrouter-provider.service';
import { GeminiProviderService } from './gemini/gemini-provider.service';
import { IAIProvider, CampaignRequest, CampaignResponse } from './interfaces/ai-provider.interface';

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
      id: 'gemini',
      name: 'Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      models: ['openrouter/auto', 'openrouter/sonoma-sky-alpha', 'openrouter/sonoma-dusk-alpha'],
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

  private currentProviderId = 'gemini';
  private providerInstances: Map<string, IAIProvider> = new Map();

  constructor(
    private openRouterProvider: OpenRouterProviderService,
    private geminiProvider: GeminiProviderService
  ) {
    this.providerInstances.set('openrouter', this.openRouterProvider);
    this.providerInstances.set('gemini', this.geminiProvider);
  }

  execute(prompt: string, _model?: string): Promise<string> {
    const provider = this.providerInstances.get(this.currentProviderId);
    if (provider) {
      return provider.executePrompt(prompt);
    }
    return this.geminiProvider.executePrompt(prompt);
  }

  async generateCampaign(request: CampaignRequest): Promise<CampaignResponse> {
    const provider = this.providerInstances.get(this.currentProviderId);
    if (provider) {
      return provider.generateCampaign(request);
    }
    return this.geminiProvider.generateCampaign(request);
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

  getProviderInstance(providerId: string): IAIProvider | undefined {
    return this.providerInstances.get(providerId);
  }
}