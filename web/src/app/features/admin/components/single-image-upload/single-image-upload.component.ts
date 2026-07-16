import { Component, inject, input, output, signal } from '@angular/core';
import { HomepageAdminService } from '../../../../core/services/homepage-admin.service';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * A single image upload slot — used by hero banner / promotional banner /
 * category / footer banner forms. Simpler than the multi-image product
 * gallery (Phase 3): one image in, one out, no reorder. The parent's form
 * owns the actual url/publicId state; this component only uploads and emits.
 */
@Component({
  selector:    'app-single-image-upload',
  standalone:  true,
  templateUrl: './single-image-upload.component.html',
  styleUrl:    './single-image-upload.component.css',
})
export class SingleImageUploadComponent {
  private readonly admin = inject(HomepageAdminService);

  readonly label      = input('Image');
  readonly section     = input.required<string>();
  readonly currentUrl  = input<string | null>(null);

  readonly uploaded = output<{ url: string; publicId: string }>();
  readonly removed  = output<void>();

  readonly uploading = signal(false);
  readonly progress  = signal(0);
  readonly error     = signal<string | null>(null);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validationError = this.validate(file);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set(null);

    try {
      const result = await this.admin.uploadImage(this.section(), file, pct => this.progress.set(pct));
      this.uploaded.emit(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploading.set(false);
    }
  }

  remove(): void {
    this.removed.emit();
  }

  private validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Please choose a JPG, PNG, or WebP image.';
    if (file.size > MAX_FILE_BYTES) return 'Image is too large (max 5 MB).';
    return null;
  }
}
