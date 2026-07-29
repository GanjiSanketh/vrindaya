import { Injectable, inject } from '@angular/core';
import type { DocData } from './marketplace-base.service';
import { MarketplaceBaseService } from './marketplace-base.service';
import { MarketplaceLogService } from './marketplace-log.service';
import type { MarketplaceProduct, ProductStatus } from '../models/marketplace-product.model';
import type { MarketplaceAttribute } from '../models/marketplace-attribute.model';
import type { MarketplaceImage } from '../models/marketplace-image.model';
import type { MarketplaceSeo } from '../models/marketplace-seo.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceProductService extends MarketplaceBaseService<MarketplaceProduct> {
  protected readonly collectionName = 'marketplaceProducts';
  private readonly logSvc = inject(MarketplaceLogService);

  protected toModel(id: string, data: DocData): MarketplaceProduct {
    return {
      id,
      websiteProductId: (data['websiteProductId'] as string) ?? '',
      name: (data['name'] as string) ?? '',
      description: (data['description'] as string) ?? '',
      brand: data['brand'] as string | undefined,
      category: data['category'] as string | undefined,
      subcategory: data['subcategory'] as string | undefined,
      productType: data['productType'] as string | undefined,
      gender: data['gender'] as string | undefined,
      images: (data['images'] as MarketplaceImage[]) ?? [],
      attributes: (data['attributes'] as MarketplaceAttribute[]) ?? [],
      seo: (data['seo'] as MarketplaceSeo) ?? { metaTitle: '', metaDescription: '', focusKeyword: '', slug: '', noIndex: false, createdAt: new Date(), updatedAt: new Date() },
      highlights: (data['highlights'] as string[]) ?? [],
      specifications: (data['specifications'] as { label: string; value: string }[]) ?? [],
      packageContents: (data['packageContents'] as string) ?? '',
      hsn: (data['hsn'] as string) ?? '',
      gst: (data['gst'] as number) ?? 0,
      countryOfOrigin: (data['countryOfOrigin'] as string) ?? '',
      status: (data['status'] as ProductStatus) ?? 'draft',
      tags: (data['tags'] as string[]) ?? [],
      notes: data['notes'] as string | undefined,
      version: (data['version'] as number) ?? 1,
      createdBy: data['createdBy'] as string | undefined,
      updatedBy: data['updatedBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async searchByName(term: string): Promise<MarketplaceProduct[]> {
    const result = await this.getAll({
      search: term,
      searchFields: ['name', 'brand', 'category'],
      pageSize: 50,
    });
    return result.items;
  }

  async getByWebsiteProductId(websiteProductId: string): Promise<MarketplaceProduct[]> {
    const result = await this.getAll({
      filters: [{ field: 'websiteProductId', op: '==', value: websiteProductId }],
    });
    return result.items;
  }

  async getByCategory(category: string): Promise<MarketplaceProduct[]> {
    const result = await this.getAll({
      filters: [{ field: 'category', op: '==', value: category }],
    });
    return result.items;
  }

  async updateStatus(id: string, status: ProductStatus): Promise<MarketplaceProduct> {
    const updated = await this.update(id, { status } as any);
    await this.logSvc.add({
      type: 'update',
      platform: '',
      marketplaceProductId: id,
      message: `Product status changed to ${status}`,
      details: `Product: ${updated.name}`,
    });
    return updated;
  }

  async addImage(productId: string, image: MarketplaceImage): Promise<MarketplaceProduct> {
    const product = await this.getById(productId);
    if (!product) throw new Error('Product not found');
    return this.update(productId, { images: [...product.images, image] } as any);
  }

  async removeImage(productId: string, imageIndex: number): Promise<MarketplaceProduct> {
    const product = await this.getById(productId);
    if (!product) throw new Error('Product not found');
    const images = product.images.filter((_, i) => i !== imageIndex);
    return this.update(productId, { images } as any);
  }

  async updateSeo(productId: string, seo: MarketplaceSeo): Promise<MarketplaceProduct> {
    return this.update(productId, { seo } as any);
  }
}
