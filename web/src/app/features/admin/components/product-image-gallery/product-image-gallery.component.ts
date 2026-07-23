import { Component, model, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatFileSize } from '../../../../shared/utils/image-processing.util';

export type GalleryImageStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface GalleryImageState {
  /** crypto.randomUUID() — stable identity for reorder/trackBy, independent of server state. */
  localId: string;
  /** The original, unprocessed file — kept so a failed processing attempt can be retried from scratch. */
  file?: File;
  /** Resized + WebP-encoded result, ready to upload as-is — set once client-side processing finishes. Retry re-uploads this directly instead of reprocessing when only the network call failed. */
  processedBlob?: Blob;
  /** Position-based Storage object name ("cover", "image-2", ...), assigned when the file is added and reused on replace so the re-upload overwrites the same object. */
  fileName?: string;
  /** Object URL while pending/uploading/error; the real URL once uploaded. */
  previewUrl: string;
  serverUrl?: string;
  publicId?: string;
  status: GalleryImageStatus;
  progress: number;
  error?: string;
  /** Dimensions/size of the processed (resized + WebP-encoded) image, shown in the preview — set once client-side processing finishes, before upload starts. */
  width?: number;
  height?: number;
  sizeBytes?: number;
}

/**
 * Presentational, admin-only free-form image gallery: drop up to `maxImages`
 * files, see per-file preview/progress/error, remove, retry, and reorder.
 * Position 0 is always the thumbnail. Doesn't know about productId or any
 * network service — the parent form owns all upload/delete calls; this
 * component only owns the drag/reorder/remove/retry *interaction* and
 * renders lifecycle state via a two-way `images` binding.
 */
@Component({
  selector:    'app-product-image-gallery',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './product-image-gallery.component.html',
  styleUrl:    './product-image-gallery.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImageGalleryComponent {
  readonly images    = model.required<GalleryImageState[]>();
  readonly maxImages = input(10);

  readonly filesAdded   = output<File[]>();
  readonly retryImage   = output<string>();
  readonly removeImage  = output<string>();
  readonly replaceImage = output<{ localId: string; file: File }>();

  readonly isFull = computed(() => this.images().length >= this.maxImages());

  private dragIndex: number | null = null;

  onDropFiles(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) this.filesAdded.emit(Array.from(files));
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  onBrowseFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) this.filesAdded.emit(Array.from(files));
    input.value = '';
  }

  retry(localId: string): void { this.retryImage.emit(localId); }
  remove(localId: string): void { this.removeImage.emit(localId); }

  onReplaceFile(localId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.replaceImage.emit({ localId, file });
    input.value = '';
  }

  moveLeft(index: number):  void { this.move(index, index - 1); }
  moveRight(index: number): void { this.move(index, index + 1); }

  private move(from: number, to: number): void {
    if (to < 0 || to >= this.images().length) return;
    this.images.update(list => {
      const copy = [...list];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  /* ── Native drag-to-reorder — a progressive enhancement over the move buttons above, which remain the primary, always-working interaction (touch, keyboard, no drag-math edge cases). ── */

  onThumbDragStart(index: number, event: DragEvent): void {
    this.dragIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onThumbDragOver(event: DragEvent): void { event.preventDefault(); }

  onThumbDrop(targetIndex: number, event: DragEvent): void {
    event.preventDefault();
    const from = this.dragIndex;
    this.dragIndex = null;
    if (from === null || from === targetIndex) return;
    this.move(from, targetIndex);
  }

  trackByLocalId(_: number, img: GalleryImageState): string { return img.localId; }

  formatSize(bytes: number): string { return formatFileSize(bytes); }
}
