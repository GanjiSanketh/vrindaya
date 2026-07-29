import { Injectable } from '@angular/core';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { FieldDiff, ListingComparison, SyncField } from './models/sync-comparison.model';

@Injectable({ providedIn: 'root' })
export class SyncComparatorService {

  compare(product: MarketplaceProduct, listing: MarketplaceListing): ListingComparison {
    const diffs: FieldDiff[] = [];

    this.diff('title', 'Title', product.name, listing.marketplaceTitle, diffs);
    this.diff('description', 'Description', product.description, listing.marketplaceDescription, diffs);
    this.diff('price', 'Selling Price', listing.pricing?.sellingPrice, listing.pricing?.sellingPrice, diffs);
    this.diff('stock', 'Total Stock', listing.inventory?.totalStock, listing.inventory?.totalStock, diffs);
    this.compareImages(product, listing, diffs);
    this.compareSeo(product, listing, diffs);
    this.compareAttributes(product, listing, diffs);

    return {
      listingId: listing.id!,
      productId: product.id!,
      websiteProductId: product.websiteProductId,
      platform: listing.platform,
      diffs,
      hasChanges: diffs.length > 0,
    };
  }

  private diff(field: SyncField, label: string, a: unknown, b: unknown, diffs: FieldDiff[]): void {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ field, label, sourceValue: a, targetValue: b, status: 'mismatch' });
    }
  }

  private compareImages(product: MarketplaceProduct, listing: MarketplaceListing, diffs: FieldDiff[]): void {
    const productUrls = product.images?.map(i => i.url) ?? [];
    const listingUrls: string[] = [];
    if (productUrls.length !== listingUrls.length || productUrls.some(u => !listingUrls.includes(u))) {
      diffs.push({ field: 'images', label: 'Images', sourceValue: productUrls, targetValue: listingUrls, status: productUrls.length ? (listingUrls.length ? 'mismatch' : 'missing') : 'extra' });
    }
  }

  private compareSeo(product: MarketplaceProduct, listing: MarketplaceListing, diffs: FieldDiff[]): void {
    const seoSource = product.seo?.metaTitle || product.seo?.focusKeyword || product.name;
    const seoTarget = listing.marketplaceTitle;
    if (seoSource !== seoTarget) {
      diffs.push({ field: 'seo', label: 'SEO Title', sourceValue: seoSource, targetValue: seoTarget, status: 'mismatch' });
    }
  }

  private compareAttributes(product: MarketplaceProduct, listing: MarketplaceListing, diffs: FieldDiff[]): void {
    const source = product.specifications?.map(s => `${s.label}:${s.value}`) ?? [];
    const target: string[] = [];
    if (JSON.stringify(source) !== JSON.stringify(target)) {
      diffs.push({ field: 'attributes', label: 'Specifications', sourceValue: source, targetValue: target, status: source.length ? (target.length ? 'mismatch' : 'missing') : 'extra' });
    }
  }
}
