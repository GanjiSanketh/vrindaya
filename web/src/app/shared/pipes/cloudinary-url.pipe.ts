import { Pipe, PipeTransform } from '@angular/core';

const CLOUDINARY_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload)\/(.+)$/;

/**
 * Transforms image URLs for optimal delivery.
 *
 * - **Cloudinary URLs**: converts to WebP with auto quality (`f_webp,q_auto`),
 *   and optionally resizes to a given width (`w_{width}`).
 * - **Non-Cloudinary URLs** (local assets, placeholders): returned unchanged.
 *
 * Usage:  {{ product.image | cloudinaryUrl }}
 *         {{ product.image | cloudinaryUrl:400 }}
 */
@Pipe({ name: 'cloudinaryUrl', pure: true, standalone: true })
export class CloudinaryUrlPipe implements PipeTransform {
  transform(url: string | null | undefined, width?: number): string {
    if (!url) return '';
    const match = url.match(CLOUDINARY_REGEX);
    if (!match) return url;

    const [, base, path] = match;
    const transforms = [`f_webp`, `q_auto`];
    if (width) transforms.push(`w_${width}`);
    return `${base}/${transforms.join(',')}/${path}`;
  }
}

/**
 * Generates a `srcset` string with multiple widths for responsive images.
 * Only works for Cloudinary URLs; returns empty string for local/placeholder images.
 *
 * Width breakpoints: 300w, 600w, 900w, 1200w.
 *
 * Usage:  {{ product.image | cloudinarySrcset }}
 */
@Pipe({ name: 'cloudinarySrcset', pure: true, standalone: true })
export class CloudinarySrcsetPipe implements PipeTransform {
  private readonly BREAKPOINTS = [300, 600, 900, 1200];

  transform(url: string | null | undefined): string {
    if (!url) return '';
    const match = url.match(CLOUDINARY_REGEX);
    if (!match) return '';

    const [, base, path] = match;
    return this.BREAKPOINTS
      .map(w => `${base}/f_webp,q_auto,w_${w}/${path} ${w}w`)
      .join(', ');
  }
}
