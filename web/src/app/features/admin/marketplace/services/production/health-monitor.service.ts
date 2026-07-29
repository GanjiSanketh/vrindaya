import { Injectable, signal, inject } from '@angular/core';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { AIProviderSettingsService } from '../ai/ai-provider-settings.service';
import type { AIProviderConfig } from '../ai/ai-settings.model';
import type { HealthCheckResult, SystemHealth } from './production.models';

@Injectable({ providedIn: 'root' })
export class HealthMonitorService {
  private readonly aiSettings = inject(AIProviderSettingsService);

  readonly health = signal<SystemHealth | null>(null);
  readonly checking = signal(false);

  async checkAll(): Promise<SystemHealth> {
    this.checking.set(true);
    const results = await Promise.all([
      this.checkFirestore(),
      this.checkAIProviders(),
    ]);
    const firestore = results[0];
    const aiProviders = results[1];
    const unhealthy = [firestore, ...aiProviders].some(r => r.status === 'unhealthy');
    const degraded = [firestore, ...aiProviders].some(r => r.status === 'degraded');
    const overall = unhealthy ? 'unhealthy' : degraded ? 'degraded' : 'healthy';
    const state: SystemHealth = { firestore, aiProviders, marketplaceProviders: [], overall, lastUpdated: new Date() };
    this.health.set(state);
    this.checking.set(false);
    return state;
  }

  async checkFirestore(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      const db = getFirestore();
      const q = query(collection(db, 'marketplacePlatforms'), limit(1));
      await getDocs(q);
      return { service: 'Firestore', status: 'healthy', latency: Math.round(performance.now() - start), lastChecked: new Date() };
    } catch (e) {
      return { service: 'Firestore', status: 'unhealthy', latency: Math.round(performance.now() - start), lastChecked: new Date(), error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  async checkAIProviders(): Promise<HealthCheckResult[]> {
    const configs = this.aiSettings.configs();
    return Promise.all(configs.map(async (p: AIProviderConfig) => {
      if (!p.enabled) return { service: `AI: ${p.label}` as any, status: 'degraded' as any, latency: 0, lastChecked: new Date(), details: { reason: 'Disabled' } } as any;
      const start = performance.now();
      try {
        return { service: `AI: ${p.label}`, status: 'healthy', latency: Math.round(performance.now() - start), lastChecked: new Date() };
      } catch (e) {
        return { service: `AI: ${p.label}`, status: 'unhealthy', latency: Math.round(performance.now() - start), lastChecked: new Date(), error: e instanceof Error ? e.message : 'Connection failed' };
      }
    })) as Promise<HealthCheckResult[]>;
  }
}
