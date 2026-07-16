import { Product } from './product.model';
import { ApiProductSummary, apiSummaryToProduct } from './product-api.model';

/** Wire shapes returned by the ASP.NET Core API (System.Text.Json camelCase). */

export interface ApiCollection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  bannerImage?: string;
  bannerImagePublicId?: string;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  productIds: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiCollectionLanding {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  products: ApiProductSummary[];
}

/** Domain shapes consumed by public components — metadata only, no resolved products (used for the collections list + search). */
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

/** The collection landing page's fully-resolved payload. */
export interface CollectionLanding {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  products: Product[];
}

export function apiCollectionToCollection(dto: ApiCollection): Collection {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    description: dto.description,
    image: dto.image,
    bannerImage: dto.bannerImage,
    featured: dto.featured,
    seoTitle: dto.seoTitle,
    seoDescription: dto.seoDescription,
    seoKeywords: dto.seoKeywords,
  };
}

export function apiCollectionLandingToCollectionLanding(dto: ApiCollectionLanding): CollectionLanding {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    description: dto.description,
    image: dto.image,
    bannerImage: dto.bannerImage,
    seoTitle: dto.seoTitle,
    seoDescription: dto.seoDescription,
    seoKeywords: dto.seoKeywords,
    products: dto.products.map(apiSummaryToProduct),
  };
}
