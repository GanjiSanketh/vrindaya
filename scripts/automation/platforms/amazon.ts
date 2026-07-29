import type { Page } from 'playwright';
import { BasePlatformAutomation, type PublishResult } from './base-platform';

export class AmazonAutomation extends BasePlatformAutomation {
  readonly platform = 'amazon';
  readonly loginUrl = 'https://sellercentral.amazon.in/ap/login';

  async login(page: Page, username: string, password: string): Promise<void> {
    await page.goto(this.loginUrl, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', username);
    await page.click('input#continue');
    await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
    await page.fill('input[type="password"]', password);
    await page.click('input#signInSubmit');
    await page.waitForURL('**/home', { timeout: 30_000 });
  }

  async createListing(page: Page, data: Record<string, unknown>): Promise<PublishResult> {
    await page.goto('https://sellercentral.amazon.in/inventory/add-a-product', { waitUntil: 'networkidle' });
    await page.fill('input[name="productName"]', (data['title'] as string) ?? '');
    await page.fill('textarea[name="description"]', (data['description'] as string) ?? '');
    if (data['mrp']) await page.fill('input[name="mrp"]', String(data['mrp']));
    if (data['sellingPrice']) await page.fill('input[name="sellingPrice"]', String(data['sellingPrice']));
    if (data['stock']) await page.fill('input[name="quantity"]', String(data['stock']));
    if (data['images']) {
      const files = (data['images'] as string[]).filter(Boolean);
      if (files.length) await page.setInputFiles('input[type="file"]', files);
    }
    await page.click('button:has-text("Save and finish")');
    await page.waitForSelector('[data-sku]', { timeout: 30_000 });
    const listingUrl = page.url();
    const marketplaceId = await page.getAttribute('[data-asin]', 'data-asin') ?? '';
    const fsn = await page.getAttribute('[data-fsn]', 'data-fsn') ?? '';
    return { listingUrl, marketplaceId, fsn, marketplaceStatus: 'published' };
  }

  async updatePrice(page: Page, listingId: string, price: number): Promise<void> {
    await page.goto(`https://sellercentral.amazon.in/inventory/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="price"]', String(price));
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }

  async updateStock(page: Page, listingId: string, stock: number): Promise<void> {
    await page.goto(`https://sellercentral.amazon.in/inventory/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="quantity"]', String(stock));
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }

  async updateImages(page: Page, listingId: string, imageUrls: string[]): Promise<void> {
    await page.goto(`https://sellercentral.amazon.in/inventory/images/${listingId}`, { waitUntil: 'networkidle' });
    if (imageUrls.length) await page.setInputFiles('input[type="file"]', imageUrls);
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 30_000 });
  }

  async updateDescription(page: Page, listingId: string, description: string): Promise<void> {
    await page.goto(`https://sellercentral.amazon.in/inventory/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('textarea[name="description"]', description);
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }
}
