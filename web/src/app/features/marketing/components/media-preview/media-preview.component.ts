import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export const MEDIA_PREVIEW_KINDS = ['image', 'video', 'pdf'] as const;
export type MediaPreviewKind = (typeof MEDIA_PREVIEW_KINDS)[number];

/**
 * Presentational only — reusable anywhere a piece of campaign media needs
 * previewing (the campaign form before saving, the campaign view page,
 * potentially a future execution detail). Renders the media itself, not
 * any surrounding "remove" chrome — that stays with the caller, exactly
 * like ExecutionProgressCardComponent's precedent.
 */
@Component({
  selector:    'app-media-preview',
  standalone:  true,
  templateUrl: './media-preview.component.html',
  styleUrl:    './media-preview.component.css',
})
export class MediaPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly kind = input.required<MediaPreviewKind>();
  readonly url  = input.required<string>();

  /** Only PDFs need this — an iframe's `src` is sanitized as a resource URL by Angular. */
  readonly safePdfUrl = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.url()));
}
