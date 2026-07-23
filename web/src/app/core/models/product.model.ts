import type { Timestamp } from 'firebase/firestore';

export interface ProductImage {
  url:      string;
  publicId: string;
  /** Legacy-only — documents written before the free-form gallery. New uploads never set this. */
  slot?:    string;
  order:    number;
}

export interface ProductSize {
  size:  string;
  stock: number;
}

export interface Product {
  id:                string;
  name:              string;
  slug:              string;
  /** Category slug — same vocabulary as Category.id below. */
  category:          string;
  subCategory?:      string;
  description?:      string;
  shortDescription?: string;
  price:             number;
  mrp:               number;
  discount:          number;
  fabric?:           string;
  pattern?:          string;
  fit?:              string;
  sleeve?:           string;
  neck?:             string;
  occasion?:         string;
  color?:            string;
  washCare?:         string;
  /** Per-size inventory ledger — source of truth for `stock` below. */
  sizes:             ProductSize[];
  /** Denormalized total = sum(sizes[].stock). Recomputed on every write, never hand-edited. */
  stock:             number;
  sku:               string;
  tags:              string[];
  featured:          boolean;
  newArrival:        boolean;
  bestSeller:        boolean;
  /** Public visibility gate — storefront only ever queries active === true. */
  active:            boolean;
  displayOrder:      number;
  createdBy:         string;
  /** Firestore Timestamp on the storefront's direct-read path; an ISO string when sourced from the API (admin). */
  createdAt:         Timestamp | string | null;
  updatedBy:         string;
  updatedAt:         Timestamp | string | null;
  images:            ProductImage[];

  costPrice?:         number;
  brand:              string;
  flipkartProductUrl?: string;
  flipkartProductId?:  string;
  seoTitle?:           string;
  seoDescription?:     string;
  seoKeywords?:        string[];
  /** Soft-delete flag — hidden everywhere but the admin's "Deleted" tab once true. */
  deleted:             boolean;
  deletedAt?:          Timestamp | string | null;

  /** Flipkart Operations (Phase 7) — admin-curated ops metadata, decoupled from active/deleted. "Launch Status" is derived: launchDate set => Launched. */
  flipkartSellerSku?:   string;
  flipkartFsn?:         string;
  launchDate?:          string | null;
  lastSyncDate?:        string | null;
  marketplacePrice?:    number;
  marketplaceMrp?:      number;
  marketplaceDiscount?: number;
  marketplaceCategory?: string;
  marketplaceTags:      string[];
  websiteClickCount:    number;
  lastClickAt?:         string | null;

  /** Product Lifecycle & Inventory (Phase 8) — replaces Phase 7's narrower listingStatus. isLowStock/isOutOfStock are derived server-side, never stored. */
  lifecycleStage:        string;
  lowStockThreshold?:    number;
  reservedStock:         number;
  autoHideWhenOutOfStock: boolean;
  stockUpdatedAt?:       string | null;
  isLowStock:            boolean;
  isOutOfStock:          boolean;

  /**
   * Backward-compat fields, derived (never persisted to Firestore) —
   * computed by ProductService's mapper so the storefront components that
   * still read the legacy shape (product-card, quick-view, wishlist-page,
   * new-arrivals, etc. — out of scope until Stage 2) keep compiling and
   * rendering unchanged. Remove once Stage 2 migrates every consumer to
   * the fields above.
   */
  image:             string;
  hoverImage?:       string;
  gallery?:          string[];
  isTrending?:       boolean;
  isNew?:            boolean;
  isBestSeller?:     boolean;
  rating:            number;
  flipkartUrl:       string;

  /* ─── Variant denormalized fields ─── */
  variantCount: number;
  totalStock: number;
  lowestPrice?: number;
  highestPrice?: number;
}

export interface Category {
  id:       string;
  slug:     string;
  name:     string;
  label?:   string;
  subtitle?: string;
  description?: string;
  icon?:    string;
  image:    string;
  bannerImage?: string;
  bgColor?: string;
  iconBg?:  string;
  biIcon?:  string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface Testimonial {
  id:       number;
  name:     string;
  location: string;
  rating:   number;
  review:   string;
  image:    string;
}

export interface LookItem {
  title:      string;
  subtitle:   string;
  image:      string;
  categoryId: string;
}

export interface FeatureItem {
  icon:  string;
  title: string;
  desc:  string;
  image: string;
}
