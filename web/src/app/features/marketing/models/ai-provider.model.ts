export type ProviderType = 'cloud' | 'local' | 'custom';
export type ProviderHealth = 'healthy' | 'degraded' | 'down';

export interface AiProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: ProviderType;
  enabled: boolean;
  priority: number;
  allowFallback: boolean;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  health: ProviderHealth;
  responseTime: number;
  costPer1k: number;
  lastChecked: string;
}

export type AiProviderDraft = Omit<AiProvider, 'id'>;

export function providerTypeLabel(type: ProviderType): string {
  return type === 'cloud' ? 'Cloud' : type === 'local' ? 'Local' : 'Custom';
}

export function healthLabel(health: ProviderHealth): string {
  return health === 'healthy' ? 'Healthy' : health === 'degraded' ? 'Stable' : 'Down';
}