/**
 * Hero banner configuration — one active banner, shared by the storefront
 * (Firestore read) and the admin management page (API read/write).
 * Timestamps are ISO-8601 strings.
 */
export interface HeroBanner {
  desktopImageUrl: string;
  mobileImageUrl: string;
  /** Cloudinary public id for the desktop image (hero-banners/desktop/...). */
  desktopStoragePath: string;
  /** Cloudinary public id for the mobile image (hero-banners/mobile/...). */
  mobileStoragePath: string;
  /** Only a published banner is rendered by the storefront. */
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** Full-state overwrite payload sent to PUT /hero-banners/active. */
export interface HeroBannerSavePayload {
  desktopImageUrl: string;
  mobileImageUrl: string;
  desktopStoragePath: string;
  mobileStoragePath: string;
  isPublished: boolean;
}

/** A single uploaded banner image, before it is persisted to Firestore. */
export interface HeroBannerUploadedImage {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  sizeBytes: number;
}
