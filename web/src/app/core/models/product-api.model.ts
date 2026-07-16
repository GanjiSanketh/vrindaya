import { Product, ProductImage, ProductSize } from './product.model';

/** Wire shapes returned by the ASP.NET Core API (System.Text.Json camelCase). */

export interface ApiProductImage {
  url:      string;
  publicId: string;
  slot?:    string;
  order:    number;
}

export interface ApiProductSize {
  size:  string;
  stock: number;
}

export interface ApiProductSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  sku: string;
  price: number;
  mrp: number;
  discount: number;
  stock: number;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  brand: string;
  flipkartProductUrl?: string;
  flipkartProductId?: string;
  deleted: boolean;
  deletedAt?: string;
  thumbnail: ApiProductImage | null;

  flipkartSellerSku?: string;
  flipkartFsn?: string;
  launchDate?: string;
  lastSyncDate?: string;
  marketplacePrice?: number;
  marketplaceMrp?: number;
  marketplaceDiscount?: number;
  marketplaceCategory?: string;
  marketplaceTags: string[];
  websiteClickCount: number;
  lastClickAt?: string;

  lifecycleStage: string;
  lowStockThreshold?: number;
  reservedStock: number;
  autoHideWhenOutOfStock: boolean;
  stockUpdatedAt?: string;
  isOutOfStock: boolean;
  isLowStock: boolean;
}

export interface ApiProductDetail extends ApiProductSummary {
  subCategory?: string;
  description?: string;
  shortDescription?: string;
  fabric?: string;
  pattern?: string;
  fit?: string;
  sleeve?: string;
  neck?: string;
  occasion?: string;
  color?: string;
  washCare?: string;
  sizes: ApiProductSize[];
  tags: string[];
  createdBy: string;
  updatedBy: string;
  images: ApiProductImage[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
}

export interface ApiPagedProducts {
  items: ApiProductSummary[];
  nextCursor: string | null;
  totalCount: number;
}

export type ProductSortField = 'displayOrder' | 'createdAt' | 'price' | 'name' | 'stock';
export type ProductFlagName = 'Featured' | 'NewArrival' | 'BestSeller';

/**
 * Server-side query for the admin product list — mirrors ProductQuery's
 * admin-mode fields exactly (see that type's doc comment on the backend
 * for the mutual-exclusion rules this maps to). `deleted` selects the
 * Active tab (false) vs the Deleted tab (true); at most one of
 * category/activeStatus/featured/newArrival/bestSeller/search/
 * minPrice+maxPrice should be set at a time — the backend silently
 * ignores everything past the first one it applies.
 */
export interface AdminProductListQuery {
  deleted: boolean;
  pageSize: number;
  cursor?: string;
  sortBy?: ProductSortField;
  sortDescending?: boolean;
  category?: string;
  activeStatus?: boolean;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ApiUploadedImage {
  url: string;
  publicId: string;
}

/** Wire body for POST /products and PUT /products/{id} — mirrors CreateProductRequest/UpdateProductRequest. */
export interface AdminProductInput {
  id?: string; // only set on create — the pre-issued id from POST /products/ids
  name: string;
  slug: string;
  category: string;
  subCategory?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  mrp: number;
  discount: number;
  fabric?: string;
  pattern?: string;
  fit?: string;
  sleeve?: string;
  neck?: string;
  occasion?: string;
  color?: string;
  washCare?: string;
  sizes: ProductSize[];
  sku: string;
  tags: string[];
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  displayOrder: number;
  images: ProductImage[];
  brand?: string;
  flipkartProductUrl?: string;
  flipkartProductId?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  lowStockThreshold?: number;
  autoHideWhenOutOfStock: boolean;
}

/** Wire body for PATCH /products/{id}/flipkart-ops — mirrors UpdateFlipkartOpsRequest. Also carries the pre-existing flipkartProductUrl/flipkartProductId (editable here too). Lifecycle stage moved to InventoryController/LifecycleService (Phase 8) — see LifecycleStageInput. */
export interface FlipkartOpsInput {
  flipkartProductUrl?: string;
  flipkartProductId?: string;
  flipkartSellerSku?: string;
  flipkartFsn?: string;
  launchDate?: string;
  lastSyncDate?: string;
  marketplacePrice?: number;
  marketplaceMrp?: number;
  marketplaceDiscount?: number;
  marketplaceCategory?: string;
  marketplaceTags: string[];
}

/** Wire shape for GET/PATCH /inventory/{productId} — mirrors InventoryDetailResponse/UpdateInventoryRequest. */
export interface ApiInventoryDetail {
  productId: string;
  sizes: ApiProductSize[];
  availableSizes: ApiProductSize[];
  stock: number;
  reservedStock: number;
  lowStockThreshold?: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  autoHideWhenOutOfStock: boolean;
  stockUpdatedAt?: string;
}

export interface UpdateInventoryInput {
  sizes: ProductSize[];
  lowStockThreshold?: number;
  autoHideWhenOutOfStock: boolean;
}

function toProductImage(img: ApiProductImage): ProductImage {
  return { url: img.url, publicId: img.publicId, slot: img.slot, order: img.order };
}

/** Admin list rows only ever come from ApiProductSummary — sizes/images/description are intentionally blank (not needed for list display; the form fetches full detail separately). */
export function apiSummaryToProduct(dto: ApiProductSummary): Product {
  const images = dto.thumbnail ? [toProductImage(dto.thumbnail)] : [];

  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    category: dto.category,
    price: dto.price,
    mrp: dto.mrp,
    discount: dto.discount,
    sizes: [],
    stock: dto.stock,
    sku: dto.sku,
    tags: [],
    featured: dto.featured,
    newArrival: dto.newArrival,
    bestSeller: dto.bestSeller,
    active: dto.active,
    displayOrder: dto.displayOrder,
    createdBy: '',
    createdAt: dto.createdAt,
    updatedBy: '',
    updatedAt: dto.updatedAt,
    images,
    brand: dto.brand,
    flipkartProductUrl: dto.flipkartProductUrl,
    flipkartProductId: dto.flipkartProductId,
    deleted: dto.deleted,
    deletedAt: dto.deletedAt ?? null,

    flipkartSellerSku: dto.flipkartSellerSku,
    flipkartFsn: dto.flipkartFsn,
    launchDate: dto.launchDate ?? null,
    lastSyncDate: dto.lastSyncDate ?? null,
    marketplacePrice: dto.marketplacePrice,
    marketplaceMrp: dto.marketplaceMrp,
    marketplaceDiscount: dto.marketplaceDiscount,
    marketplaceCategory: dto.marketplaceCategory,
    marketplaceTags: dto.marketplaceTags,
    websiteClickCount: dto.websiteClickCount,
    lastClickAt: dto.lastClickAt ?? null,

    lifecycleStage: dto.lifecycleStage,
    lowStockThreshold: dto.lowStockThreshold,
    reservedStock: dto.reservedStock,
    autoHideWhenOutOfStock: dto.autoHideWhenOutOfStock,
    stockUpdatedAt: dto.stockUpdatedAt ?? null,
    isOutOfStock: dto.isOutOfStock,
    isLowStock: dto.isLowStock,

    image: dto.thumbnail?.url ?? '',
    isTrending: dto.featured,
    isNew: dto.newArrival,
    isBestSeller: dto.bestSeller,
    rating: 4.5,
    flipkartUrl: dto.flipkartProductUrl ?? '',
  };
}

export function apiDetailToProduct(dto: ApiProductDetail): Product {
  const images = [...dto.images].sort((a, b) => a.order - b.order).map(toProductImage);

  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    category: dto.category,
    subCategory: dto.subCategory,
    description: dto.description,
    shortDescription: dto.shortDescription,
    price: dto.price,
    mrp: dto.mrp,
    discount: dto.discount,
    fabric: dto.fabric,
    pattern: dto.pattern,
    fit: dto.fit,
    sleeve: dto.sleeve,
    neck: dto.neck,
    occasion: dto.occasion,
    color: dto.color,
    washCare: dto.washCare,
    sizes: dto.sizes,
    stock: dto.stock,
    sku: dto.sku,
    tags: dto.tags,
    featured: dto.featured,
    newArrival: dto.newArrival,
    bestSeller: dto.bestSeller,
    active: dto.active,
    displayOrder: dto.displayOrder,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedBy: dto.updatedBy,
    updatedAt: dto.updatedAt,
    images,
    brand: dto.brand,
    flipkartProductUrl: dto.flipkartProductUrl,
    flipkartProductId: dto.flipkartProductId,
    seoTitle: dto.seoTitle,
    seoDescription: dto.seoDescription,
    seoKeywords: dto.seoKeywords,
    deleted: dto.deleted,
    deletedAt: dto.deletedAt ?? null,

    flipkartSellerSku: dto.flipkartSellerSku,
    flipkartFsn: dto.flipkartFsn,
    launchDate: dto.launchDate ?? null,
    lastSyncDate: dto.lastSyncDate ?? null,
    marketplacePrice: dto.marketplacePrice,
    marketplaceMrp: dto.marketplaceMrp,
    marketplaceDiscount: dto.marketplaceDiscount,
    marketplaceCategory: dto.marketplaceCategory,
    marketplaceTags: dto.marketplaceTags,
    websiteClickCount: dto.websiteClickCount,
    lastClickAt: dto.lastClickAt ?? null,

    lifecycleStage: dto.lifecycleStage,
    lowStockThreshold: dto.lowStockThreshold,
    reservedStock: dto.reservedStock,
    autoHideWhenOutOfStock: dto.autoHideWhenOutOfStock,
    stockUpdatedAt: dto.stockUpdatedAt ?? null,
    isOutOfStock: dto.isOutOfStock,
    isLowStock: dto.isLowStock,

    image: images[0]?.url ?? '',
    hoverImage: images[1]?.url,
    gallery: images.slice(1).map(i => i.url),
    isTrending: dto.featured,
    isNew: dto.newArrival,
    isBestSeller: dto.bestSeller,
    rating: 4.5,
    flipkartUrl: dto.flipkartProductUrl ?? '',
  };
}
