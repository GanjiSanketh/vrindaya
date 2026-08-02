import { inject, Pipe, PipeTransform } from '@angular/core';
import { CloudinaryImageService, RESPONSIVE_WIDTHS } from '../../core/services/cloudinary-image.service';

/**
 * Transforms image URLs for optimal delivery.
 *
 * - **Cloudinary URLs**: converts to `f_auto,q_auto` (browser picks AVIF/WebP,
 *   Cloudinary auto-balances quality vs. size) and optionally resizes to a
 *   given width and/or applies a crop.
 * - **Non-Cloudinary URLs** (local assets, placeholders): returned unchanged.
 *
 * Usage:  {{ product.image | cloudinaryUrl }}
 *         {{ product.image | cloudinaryUrl:600 }}
 *         {{ hero.image | cloudinaryUrl:1920:'fill' }}
 */
@Pipe({ name: 'cloudinaryUrl', pure: true, standalone: true })
export class CloudinaryUrlPipe implements PipeTransform {
  private readonly service = inject(CloudinaryImageService);

  transform(url: string | null | undefined, width?: number, crop?: 'fill'): string {
    return this.service.optimize(url, { width, crop });
  }
}

/**
 * Generates a `srcset` string with multiple widths for responsive images.
 * Only works for Cloudinary URLs; returns empty string for local/placeholder images.
 *
 * Width breakpoints: 320w, 480w, 768w, 1024w, 1440w, 1920w.
 *
 * Usage:  {{ product.image | cloudinarySrcset }}
 */
@Pipe({ name: 'cloudinarySrcset', pure: true, standalone: true })
export class CloudinarySrcsetPipe implements PipeTransform {
  private readonly service = inject(CloudinaryImageService);

  transform(url: string | null | undefined, widths: readonly number[] = RESPONSIVE_WIDTHS): string {
    return this.service.srcset(url, widths);
  }
}
