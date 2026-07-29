export type AIProviderType = 'none' | 'openai' | 'gemini' | 'claude' | 'ollama' | 'openrouter' | 'azure-openai';

export interface AISettings {
  provider: AIProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  visionModel?: string;
  embeddingModel?: string;
  apiEndpoint?: string;
  apiKey?: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'none',
  model: '',
  temperature: 0.7,
  maxTokens: 1024,
};

export interface AIProviderConfig {
  provider: AIProviderType;
  label: string;
  enabled: boolean;
  apiKey: string;
  endpoint: string;
  model: string;
  visionModel: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface AIProvidersSettings {
  providers: AIProviderConfig[];
  defaultProvider: AIProviderType;
}

export function createDefaultProviderConfig(provider: AIProviderType): AIProviderConfig {
  return {
    provider,
    label: providerLabel(provider),
    enabled: false,
    apiKey: '',
    endpoint: providerDefaultEndpoint(provider),
    model: providerDefaultModel(provider),
    visionModel: providerDefaultVisionModel(provider),
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 30000,
  };
}

export function providerLabel(type: AIProviderType): string {
  const labels: Record<string, string> = {
    openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude',
    ollama: 'Ollama', 'azure-openai': 'Azure OpenAI', openrouter: 'OpenRouter',
  };
  return labels[type] || type;
}

function providerDefaultEndpoint(type: AIProviderType): string {
  const map: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    gemini: 'https://generativelanguage.googleapis.com',
    claude: 'https://api.anthropic.com/v1',
    ollama: 'http://localhost:11434',
    openrouter: 'https://openrouter.ai/api/v1',
    'azure-openai': '',
  };
  return map[type] || '';
}

function providerDefaultModel(type: AIProviderType): string {
  const map: Record<string, string> = {
    openai: 'gpt-4o-mini', gemini: 'gemini-1.5-flash', claude: 'claude-3-haiku-20240307',
    ollama: 'llama3', openrouter: 'openai/gpt-4o-mini', 'azure-openai': 'gpt-4o-mini',
  };
  return map[type] || '';
}

function providerDefaultVisionModel(type: AIProviderType): string {
  const map: Record<string, string> = {
    openai: 'gpt-4o', gemini: 'gemini-1.5-pro', claude: 'claude-3-opus-20240229',
    ollama: 'llava', openrouter: 'openai/gpt-4o', 'azure-openai': 'gpt-4o',
  };
  return map[type] || '';
}

export const ALL_PROVIDERS: AIProviderType[] = ['openai', 'gemini', 'claude', 'ollama', 'openrouter', 'azure-openai'];
export const STORAGE_KEY = 'vrindaya_ai_providers';
