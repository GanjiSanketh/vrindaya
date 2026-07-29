import type { MarketplaceImage } from './marketplace-image.model';
import type { MarketplaceAttribute } from './marketplace-attribute.model';
import type { MarketplaceSeo } from './marketplace-seo.model';

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface MarketplaceProduct {
  id?: string;
  websiteProductId: string;
  name: string;
  description: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  gender?: string;
  images: MarketplaceImage[];
  attributes: MarketplaceAttribute[];
  seo: MarketplaceSeo;
  highlights: string[];
  specifications: { label: string; value: string }[];
  packageContents: string;
  hsn: string;
  gst: number;
  countryOfOrigin: string;
  status: ProductStatus;
  tags: string[];
  notes?: string;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
