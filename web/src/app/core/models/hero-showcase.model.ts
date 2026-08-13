/**
 * Hero Showcase configuration — the CMS-driven homepage hero, shared by the
 * storefront (Firestore read of homepageConfig/active.heroShowcase) and the
 * admin management screen (API read/write). When `enabled` is false the
 * homepage falls back to the legacy Hero Banner (heroBanners/active).
 * Timestamps are ISO-8601 strings.
 */
export interface HeroShowcase {
  enabled: boolean;
  /** Whether the storefront auto-rotates through enabled items. */
  autoplay: boolean;
  /** Whether auto-rotation pauses while the pointer is over the showcase. */
  pauseOnHover: boolean;
  /** Seconds per slide — read from Firestore, never hardcoded. */
  rotationIntervalSeconds: number;
  /** "fade" (implemented); "slide" / "scaleFade" are reserved for the future. */
  transition: HeroShowcaseTransition;
  items: HeroShowcaseItem[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type HeroShowcaseTransition = 'fade' | 'slide' | 'scaleFade';

/** CSS object-position keyword — controls where the model sits in the hero frame. */
export type HeroShowcasePosition = 'top' | 'center' | 'bottom' | 'left' | 'right';

export const HERO_SHOWCASE_POSITIONS: HeroShowcasePosition[] = ['top', 'center', 'bottom', 'left', 'right'];

/** One configurable slide in the hero showcase. */
export interface HeroShowcaseItem {
  /** Stable client-generated id used as the Angular track key. */
  itemId: string;
  /** Cloudinary secure URL of the showcase image. */
  imageUrl: string;
  /** Cloudinary public id (hero-showcase/items/...) — used to delete/replace the stored asset. */
  storagePath: string;
  /** Optional Cloudinary URL used on small screens — fashion imagery often needs a tighter crop. */
  mobileImageUrl: string;
  /** Cloudinary public id of the mobile image — used to delete/replace the stored asset. */
  mobileStoragePath: string;
  /** object-position keyword — "center" when unset. */
  imagePosition: HeroShowcasePosition;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  /** 1-based position; reassigned on every drag-and-drop reorder. */
  displayOrder: number;
  /** Disabled items are kept but never rendered by the storefront. */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full-state overwrite payload sent to PUT /homepage-config/hero-showcase. */
export interface HeroShowcaseSavePayload {
  enabled: boolean;
  autoplay: boolean;
  pauseOnHover: boolean;
  rotationIntervalSeconds: number;
  transition: string;
  items: HeroShowcaseItemSavePayload[];
}

/** One showcase slide in a save payload. */
export interface HeroShowcaseItemSavePayload {
  itemId: string;
  imageUrl: string;
  storagePath: string;
  mobileImageUrl: string;
  mobileStoragePath: string;
  imagePosition: HeroShowcasePosition;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  displayOrder: number;
  enabled: boolean;
}

/** A single uploaded showcase image, before it is persisted to Firestore. */
export interface HeroShowcaseUploadedImage {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  sizeBytes: number;
}
