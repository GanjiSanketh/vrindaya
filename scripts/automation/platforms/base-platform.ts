import type { Page, Browser } from 'playwright';
import { chromium } from 'playwright';
import { LAUNCH_OPTIONS, AUTOMATION_CONFIG } from '../playwright.config';

export interface PublishResult {
  listingUrl: string;
  marketplaceId: string;
  fsn: string;
  marketplaceStatus: string;
}

export abstract class BasePlatformAutomation {
  abstract readonly platform: string;
  abstract readonly loginUrl: string;

  async launch(): Promise<Browser> {
    return chromium.launch(LAUNCH_OPTIONS);
  }

  async newPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage({ viewport: AUTOMATION_CONFIG.viewport });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-IN,en;q=0.9' });
    return page;
  }

  abstract login(page: Page, username: string, password: string): Promise<void>;

  abstract createListing(page: Page, data: Record<string, unknown>): Promise<PublishResult>;
  abstract updatePrice(page: Page, listingId: string, price: number): Promise<void>;
  abstract updateStock(page: Page, listingId: string, stock: number): Promise<void>;
  abstract updateImages(page: Page, listingId: string, imageUrls: string[]): Promise<void>;
  abstract updateDescription(page: Page, listingId: string, description: string): Promise<void>;

  async retry<T>(fn: () => Promise<T>, maxRetries = AUTOMATION_CONFIG.maxRetries): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (i < maxRetries - 1) await new Promise(r => setTimeout(r, AUTOMATION_CONFIG.retryDelayMs));
      }
    }
    throw lastError ?? new Error('Retry failed');
  }
}
