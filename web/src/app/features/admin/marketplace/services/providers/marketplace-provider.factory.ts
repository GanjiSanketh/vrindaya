import { Injectable, inject } from '@angular/core';
import type { IMarketplaceProvider, MarketplaceProviderConfig } from './marketplace-provider.interface';
import type { MarketplacePlatformType } from '../../models/marketplace-platform.model';
import { MarketplaceService } from '../marketplace.service';
import { AmazonProvider } from './providers/amazon.provider';
import { FlipkartProvider } from './providers/flipkart.provider';
import { MeeshoProvider } from './providers/meesho.provider';
import { MyntraProvider } from './providers/myntra.provider';
import { AjioProvider } from './providers/ajio.provider';

const PROVIDER_MAP: Partial<Record<MarketplacePlatformType, new () => IMarketplaceProvider>> = {
  amazon: AmazonProvider,
  flipkart: FlipkartProvider,
  meesho: MeeshoProvider,
  myntra: MyntraProvider,
  ajio: AjioProvider,
};

@Injectable({ providedIn: 'root' })
export class MarketplaceProviderFactory {
  private readonly marketplaceSvc = inject(MarketplaceService);
  private readonly cache = new Map<MarketplacePlatformType, IMarketplaceProvider>();

  async getProvider(platform: MarketplacePlatformType): Promise<IMarketplaceProvider> {
    const cached = this.cache.get(platform);
    if (cached?.isConfigured()) return cached;

    const provider = this.create(platform);
    const config = await this.fetchConfig(platform);
    if (config) provider.configure(config);
    this.cache.set(platform, provider);
    return provider;
  }

  create(platform: MarketplacePlatformType): IMarketplaceProvider {
    const PlatformClass = PROVIDER_MAP[platform];
    if (!PlatformClass) throw new Error(`No provider for platform: ${platform}`);
    return new PlatformClass();
  }

  private async fetchConfig(platform: MarketplacePlatformType): Promise<MarketplaceProviderConfig | null> {
    try {
      const result = await this.marketplaceSvc.getAll({
        filters: [{ field: 'name', op: '==', value: platform }],
        pageSize: 1,
      });
      const p = result.items[0];
      if (!p) return null;
      return { credentials: p.credentials, config: p.config };
    } catch { return null; }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
