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
  pricing?: PricingResponse;
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

  variantCount: number;
  totalStock: number;
  lowestPrice?: number;
  highestPrice?: number;
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
  variants: ApiVariant[];
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

export interface VariantImageSlotInput {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface VariantImageInput {
  primary?: VariantImageSlotInput;
  front?: VariantImageSlotInput;
  back?: VariantImageSlotInput;
  left?: VariantImageSlotInput;
  right?: VariantImageSlotInput;
  closeup?: VariantImageSlotInput;
  gallery: VariantImageSlotInput[];
}

export interface VariantSizeInput {
  size: string;
  stock: number;
}

export interface VariantRequest {
  id?: string;
  colourName: string;
  colourHex?: string;
  sku: string;
  sellingPrice?: number;
  mrp?: number;
  purchaseCost?: number;
  packagingCost?: number;
  flipkartCommission?: number;
  shippingCharges?: number;
  marketingCost?: number;
  otherCharges?: number;
  desiredProfit?: number;
  flipkartUrl?: string;
  displayOrder: number;
  isActive: boolean;
  images: VariantImageInput;
  sizes: VariantSizeInput[];
}

export interface ApiVariantImage {
  primary?: ApiVariantImageSlot;
  front?: ApiVariantImageSlot;
  back?: ApiVariantImageSlot;
  left?: ApiVariantImageSlot;
  right?: ApiVariantImageSlot;
  closeup?: ApiVariantImageSlot;
  gallery: ApiVariantImageSlot[];
}

export interface ApiVariantImageSlot {
  url: string;
  publicId: string;
  width: number;
  height: number;
  alt?: string;
}

export interface ApiVariantSize {
  size: string;
  stock: number;
}

export interface ApiVariant {
  id: string;
  productId: string;
  colourName: string;
  colourHex?: string;
  sku: string;
  sellingPrice?: number;
  mrp?: number;
  purchaseCost?: number;
  packagingCost?: number;
  flipkartCommission?: number;
  shippingCharges?: number;
  marketingCost?: number;
  otherCharges?: number;
  desiredProfit?: number;
  flipkartUrl?: string;
  displayOrder: number;
  isActive: boolean;
  images: ApiVariantImage;
  sizes: ApiVariantSize[];
  createdAt: string;
  updatedAt: string;
}

/* ── Dashboard DTOs ── */

export interface DashboardDto {
  summaryCards: SummaryCardsDto;
  profitAnalytics: ProfitAnalyticsDto;
  categoryAnalytics: CategoryAnalyticsDto[];
  lowStockProducts: LowStockProductDto[];
  topExpensiveProducts: ProductSummaryDto[];
  mostProfitableProducts: ProductProfitDto[];
  recentlyAddedProducts: ProductSummaryDto[];
  outOfStockProducts: OutOfStockProductDto[];
  inventoryByCategory: ChartDataPoint[];
  inventoryValueDistribution: ChartDataPoint[];
  revenueDistribution: ChartDataPoint[];
  profitDistribution: ChartDataPoint[];
  productStatusDistribution: ChartDataPoint[];
  topRevenueProducts: BarDataPoint[];
  topProfitProducts: BarDataPoint[];
  stockPerProduct: BarDataPoint[];
  purchaseCostVsSellingPrice: CategoryCostPriceDto[];
  productTypeDistribution: ChartDataPoint[];
  todaySnapshot: TodaySnapshotDto;
}

export interface SummaryCardsDto {
  totalProducts: number;
  totalVariants: number;
  inventoryQuantity: number;
  inventoryValue: number;
  potentialSalesValue: number;
  expectedProfit: number;
  averageProfitPercent: number;
  averageRoiPercent: number;
}

export interface ProfitAnalyticsDto {
  averageProfitPercent: number;
  averageRoiPercent: number;
  averageSellingPrice: number;
  averagePurchaseCost: number;
  highestMarginProduct: ProductProfitInfo | null;
  lowestMarginProduct: ProductProfitInfo | null;
}

export interface ProductProfitInfo {
  productId: string;
  productName: string;
  imageUrl: string | null;
  variantName: string | null;
  profitPercent: number;
  profit: number;
}

export interface CategoryAnalyticsDto {
  category: string;
  productCount: number;
  totalStock: number;
  inventoryValue: number;
  expectedProfit: number;
}

export interface LowStockProductDto {
  productId: string;
  productName: string;
  imageUrl: string | null;
  category: string;
  stock: number;
  sellingPrice: number;
}

export interface ProductSummaryDto {
  productId: string;
  productName: string;
  imageUrl: string | null;
  category: string;
  sellingPrice: number;
  createdAt: string;
}

export interface ProductProfitDto {
  productId: string;
  productName: string;
  imageUrl: string | null;
  category: string;
  sellingPrice: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
}

export interface OutOfStockProductDto {
  productId: string;
  productName: string;
  imageUrl: string | null;
  category: string;
  stock: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface BarDataPoint {
  label: string;
  value: number;
}

export interface CategoryCostPriceDto {
  category: string;
  purchaseCost: number;
  sellingPrice: number;
}

export interface TodaySnapshotDto {
  products: number;
  variants: number;
  totalUnits: number;
  inventoryCost: number;
  potentialRevenue: number;
  expectedProfit: number;
  averageMarginPercent: number;
  averageRoiPercent: number;
}

/** Wire body for POST /products and PUT /products/{id} — mirrors CreateProductRequest/UpdateProductRequest. */
export interface PricingInput {
  purchaseCost?: number;
  packagingCharges?: number;
  flipkartCharges?: number;
  otherCharges?: number;
  desiredProfit?: number;
  totalCost?: number;
  sellingPrice?: number;
  profitMargin?: number;
  roi?: number;
}

export interface PricingResponse {
  purchaseCost: number;
  packagingCharges: number;
  flipkartCharges: number;
  otherCharges: number;
  desiredProfit: number;
  totalCost: number;
  sellingPrice: number;
  profitMargin: number;
  roi: number;
}

export interface AdminProductInput {
  id?: string;
  name: string;
  slug: string;
  category: string;
  subCategory?: string;
  description?: string;
  shortDescription?: string;
  fabric?: string;
  pattern?: string;
  fit?: string;
  sleeve?: string;
  neck?: string;
  occasion?: string;
  washCare?: string;
  tags: string[];
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  displayOrder: number;
  images: ProductImage[];
  pricing?: PricingInput;
  brand?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  lowStockThreshold?: number;
  autoHideWhenOutOfStock: boolean;
  variants?: VariantRequest[];
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

/* ── Sales ── */

export interface SaleDto {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  variantId: string;
  colourName: string;
  category: string;
  size: string;
  quantity: number;
  saleChannel: string;
  sellingPrice: number;
  purchaseCost: number;
  packagingCost: number;
  flipkartCommission: number;
  shippingCharges: number;
  marketingCost: number;
  otherCharges: number;
  totalCost: number;
  amountReceived: number;
  profit: number;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  soldAt: string;
  createdAt: string;
}

export interface CreateSaleRequest {
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  saleChannel: string;
  sellingPrice: number;
  flipkartCommission: number;
  shippingCharges: number;
  marketingCost: number;
  otherCharges: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  notes?: string;
  soldAt?: string;
}

export interface SalesSummaryDto {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  todayRevenue: number;
  todayProfit: number;
  todayOrders: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  monthlyOrders: number;
  revenueByCategory: ChartDataPoint[];
  revenueByChannel: ChartDataPoint[];
  profitByCategory: ChartDataPoint[];
  ordersByChannel: ChartDataPoint[];
  paymentMethodDistribution: ChartDataPoint[];
  monthlyTrend: MonthlySalesTrend[];
  topSellingProducts: ProductSalesDto[];
}

export interface MonthlySalesTrend {
  month: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface ProductSalesDto {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  revenue: number;
  profit: number;
}

function toProductImage(img: ApiProductImage): ProductImage {
  return { url: img.url, publicId: img.publicId, slot: img.slot, order: img.order };
}

/** Admin list rows only ever come from ApiProductSummary — sizes/images/description are intentionally blank (not needed for list display; the form fetches full detail separately). */
export function apiSummaryToProduct(dto: ApiProductSummary): Product {
  console.log('[apiSummaryToProduct]', { id: dto.id, name: dto.name, flipkartProductUrl: dto.flipkartProductUrl });
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
    pricing: dto.pricing,
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

    thumbnailUrl: dto.thumbnail?.url,
    image: dto.thumbnail?.url ?? '',
    isTrending: dto.featured,
    isNew: dto.newArrival,
    isBestSeller: dto.bestSeller,
    rating: 4.5,
    flipkartUrl: dto.flipkartProductUrl ?? '',

    variantCount: dto.variantCount,
    totalStock: dto.totalStock,
    lowestPrice: dto.lowestPrice,
    highestPrice: dto.highestPrice,
  };
}

/** Same but falls back to any variant's flipkartUrl when the product-level field is empty (defence-in-depth — the backend sync should keep them in sync). */
export function apiDetailToProduct(dto: ApiProductDetail): Product {
  // Derive flipkartUrl from the first variant that has one when the product-level field is empty
  const flipkartUrl = dto.flipkartProductUrl
    ?? dto.variants?.find(v => v.flipkartUrl)?.flipkartUrl
    ?? '';
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
    pricing: dto.pricing,
    brand: dto.brand,
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

    thumbnailUrl: dto.thumbnail?.url,
    variants: dto.variants as any[],
    image: images[0]?.url ?? '',
    hoverImage: images[1]?.url,
    gallery: images.slice(1).map(i => i.url),
    isTrending: dto.featured,
    isNew: dto.newArrival,
    isBestSeller: dto.bestSeller,
    rating: 4.5,
    flipkartUrl,

    variantCount: dto.variantCount,
    totalStock: dto.totalStock,
    lowestPrice: dto.lowestPrice,
    highestPrice: dto.highestPrice,
  };
}
