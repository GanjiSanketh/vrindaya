export interface MarketplaceSeo {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  slug: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  noIndex: boolean;
  createdAt: Date;
  updatedAt: Date;
}
