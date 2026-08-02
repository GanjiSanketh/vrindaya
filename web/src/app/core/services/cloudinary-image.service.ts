import { Injectable } from '@angular/core';

/**
 * Responsive widths used when generating Cloudinary `srcset` candidates.
 * The browser picks the closest candidate above its layout size, so the
 * exact set only needs to cover the common viewport/pixel-ratio range.
 */
export const RESPONSIVE_WIDTHS: readonly number[] = [320, 480, 768, 1024, 1440, 1920];

/** Base portion of a Cloudinary upload URL — `https://res.cloudinary.com/<cloud>/image/upload`. */
const CLOUDINARY_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload)\/(.+)$/;

export type CloudinaryCrop = 'fill' | 'scale' | 'fit' | 'pad' | 'thumb';

export interface CloudinaryOptions {
  /** Output width in pixels. Omit to keep the original width. */
  width?: number;
  /**
   * Crop mode. `fill` is used for full-bleed heroes (keeps aspect ratio when
   * only width is given, matching `c_fill` semantics without a forced height).
   */
  crop?: CloudinaryCrop;
}

/**
 * Reusable Cloudinary delivery helper.
 *
 * Every Cloudinary URL rendered by the storefront is passed through one of
 * these methods so it is always served with `f_auto,q_auto` (browser picks
 * AVIF/WebP, quality auto-balances size vs. fidelity) plus an explicit
 * width. Local/placeholder assets are returned unchanged.
 */
@Injectable({ providedIn: 'root' })
export class CloudinaryImageService {
  /** Single optimized URL, e.g. `f_auto,q_auto,w_1920,c_fill`. */
  optimize(url: string | null | undefined, options: CloudinaryOptions = {}): string {
    if (!url) return '';
    const match = url.match(CLOUDINARY_REGEX);
    if (!match) return url;

    const [, base, path] = match;
    const parts = ['f_auto', 'q_auto'];
    if (options.width) parts.push(`w_${options.width}`);
    if (options.crop) parts.push(`c_${options.crop}`);
    return `${base}/${parts.join(',')}/${path}`;
  }

  /** `srcset` string for responsive images (or '' for non-Cloudinary URLs). */
  srcset(url: string | null | undefined, widths: readonly number[] = RESPONSIVE_WIDTHS): string {
    if (!url) return '';
    const match = url.match(CLOUDINARY_REGEX);
    if (!match) return '';

    const [, base, path] = match;
    return widths.map(w => `${base}/f_auto,q_auto,w_${w}/${path} ${w}w`).join(', ');
  }

  /** Full-bleed desktop hero — width 1920, crop fill. */
  heroDesktop(url: string | null | undefined): string {
    return this.optimize(url, { width: 1920, crop: 'fill' });
  }

  /** Product/category card image — width 600. */
  productCard(url: string | null | undefined): string {
    return this.optimize(url, { width: 600 });
  }

  /** Category banner — width 1200. */
  categoryBanner(url: string | null | undefined): string {
    return this.optimize(url, { width: 1200 });
  }

  /** Small thumbnail — width 300. */
  thumbnail(url: string | null | undefined): string {
    return this.optimize(url, { width: 300 });
  }
}
