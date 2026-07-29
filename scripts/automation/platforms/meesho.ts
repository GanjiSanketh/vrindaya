import type { Page } from 'playwright';
import { BasePlatformAutomation, type PublishResult } from './base-platform';

export class MeeshoAutomation extends BasePlatformAutomation {
  readonly platform = 'meesho';
  readonly loginUrl = 'https://supplier.meesho.com/login';

  async login(page: Page, username: string, password: string): Promise<void> {
    await page.goto(this.loginUrl, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
  }

  async createListing(page: Page, data: Record<string, unknown>): Promise<PublishResult> {
    await page.goto('https://supplier.meesho.com/products/add', { waitUntil: 'networkidle' });
    await page.fill('input[name="productName"]', (data['title'] as string) ?? '');
    await page.fill('textarea[name="description"]', (data['description'] as string) ?? '');
    if (data['mrp']) await page.fill('input[name="mrp"]', String(data['mrp']));
    if (data['sellingPrice']) await page.fill('input[name="sellingPrice"]', String(data['sellingPrice']));
    if (data['stock']) await page.fill('input[name="stock"]', String(data['stock']));
    if (data['category']) await page.selectOption('select[name="category"]', data['category'] as string);
    if (data['images']) {
      const files = (data['images'] as string[]).filter(Boolean);
      if (files.length) await page.setInputFiles('input[type="file"]', files);
    }
    await page.click('button:has-text("Submit")');
    await page.waitForSelector('[data-product-id]', { timeout: 30_000 });
    const listingUrl = await page.getAttribute('[data-product-url]', 'data-product-url') ?? '';
    const marketplaceId = await page.getAttribute('[data-product-id]', 'data-product-id') ?? '';
    return { listingUrl, marketplaceId, fsn: '', marketplaceStatus: 'published' };
  }

  async updatePrice(page: Page, listingId: string, price: number): Promise<void> {
    await page.goto(`https://supplier.meesho.com/products/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="sellingPrice"]', String(price));
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }

  async updateStock(page: Page, listingId: string, stock: number): Promise<void> {
    await page.goto(`https://supplier.meesho.com/products/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('input[name="stock"]', String(stock));
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }

  async updateImages(page: Page, listingId: string, imageUrls: string[]): Promise<void> {
    await page.goto(`https://supplier.meesho.com/products/edit/${listingId}`, { waitUntil: 'networkidle' });
    if (imageUrls.length) await page.setInputFiles('input[type="file"]', imageUrls);
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 30_000 });
  }

  async updateDescription(page: Page, listingId: string, description: string): Promise<void> {
    await page.goto(`https://supplier.meesho.com/products/edit/${listingId}`, { waitUntil: 'networkidle' });
    await page.fill('textarea[name="description"]', description);
    await page.click('button:has-text("Save")');
    await page.waitForSelector('[data-saved]', { timeout: 15_000 });
  }
}
