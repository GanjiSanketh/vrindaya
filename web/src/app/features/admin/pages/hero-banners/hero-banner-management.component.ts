import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HeroBannerAdminService } from '../../services/hero-banner-admin.service';
import { HeroBanner, HeroBannerSavePayload, HeroBannerUploadedImage } from '../../../../core/models/hero-banner.model';
import { formatFileSize } from '../../../../shared/utils/image-processing.util';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Hero Banner Management — the single place banners are managed.
 * Uploads hit the API (storage only, no Firestore write), so nothing is
 * ever live until the admin explicitly saves (keeps publish state) or
 * publishes (makes it live immediately).
 */
@Component({
  selector: 'app-hero-banner-management',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './hero-banner-management.component.html',
  styleUrl: './hero-banner-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBannerManagementComponent implements OnInit {
  private readonly admin = inject(HeroBannerAdminService);

  /** The persisted (saved/published) banner. */
  readonly current = signal<HeroBanner | null>(null);
  /** Newly uploaded images not yet persisted. */
  readonly desktopPending = signal<HeroBannerUploadedImage | null>(null);
  readonly mobilePending = signal<HeroBannerUploadedImage | null>(null);

  readonly loading = signal(true);
  readonly uploadingDesktop = signal(false);
  readonly uploadingMobile = signal(false);
  readonly saving = signal(false);
  readonly publishing = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  /** Immediate object-URL previews of a file the admin just selected. */
  private readonly desktopPreview = signal<string | null>(null);
  private readonly mobilePreview = signal<string | null>(null);
  private readonly desktopInfo = signal<string | null>(null);
  private readonly mobileInfo = signal<string | null>(null);

  readonly desktopSrc = computed<string | null>(() =>
    this.desktopPreview() ?? this.desktopPending()?.url ?? this.current()?.desktopImageUrl ?? null);
  readonly mobileSrc = computed<string | null>(() =>
    this.mobilePreview() ?? this.mobilePending()?.url ?? this.current()?.mobileImageUrl ?? null);
  readonly desktopHint = this.desktopInfo.asReadonly();
  readonly mobileHint = this.mobileInfo.asReadonly();
  readonly hasPending = computed(() => !!this.desktopPending() || !!this.mobilePending());
  readonly hasPublishedBanner = computed(() => !!this.current()?.isPublished);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.current.set(await this.admin.getActive());
    } catch {
      this.error.set('Could not load the current banner.');
    } finally {
      this.loading.set(false);
    }
  }

  onDesktopFileSelected(event: Event): void {
    void this.onFileSelected(event, 'desktop');
  }

  onMobileFileSelected(event: Event): void {
    void this.onFileSelected(event, 'mobile');
  }

  private async onFileSelected(event: Event, slot: 'desktop' | 'mobile'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const validationError = this.validate(file);
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.error.set(null);

    const isDesktop = slot === 'desktop';
    const preview = isDesktop ? this.desktopPreview : this.mobilePreview;
    const info = isDesktop ? this.desktopInfo : this.mobileInfo;
    const uploading = isDesktop ? this.uploadingDesktop : this.uploadingMobile;

    const objectUrl = URL.createObjectURL(file);
    preview.set(objectUrl);
    info.set(`${file.type.split('/')[1].toUpperCase()} ${formatFileSize(file.size)} — uploading…`);
    uploading.set(true);

    try {
      const uploaded = isDesktop
        ? await this.admin.uploadDesktopImage(file)
        : await this.admin.uploadMobileImage(file);

      URL.revokeObjectURL(objectUrl);
      (isDesktop ? this.desktopPending : this.mobilePending).set(uploaded);
      preview.set(uploaded.url);
      info.set(`${file.type.split('/')[1].toUpperCase()} ${formatFileSize(file.size)} → WebP ${formatFileSize(uploaded.sizeBytes)} (${uploaded.width}×${uploaded.height})`);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      preview.set(null);
      info.set(null);
      this.error.set(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      uploading.set(false);
    }
  }

  private validate(file: File): string | null {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      return 'Only JPG, JPEG, PNG, or WebP images are accepted.';
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return `Image is too large (max ${MAX_IMAGE_SIZE / (1024 * 1024)} MB).`;
    }
    return null;
  }

  /** Discards pending (unsaved) uploads and restores the published banner preview. */
  async replaceBanner(): Promise<void> {
    if (this.saving() || this.publishing()) return;
    this.error.set(null);
    try {
      const desktop = this.desktopPending();
      const mobile = this.mobilePending();
      if (desktop?.storagePath) await this.admin.deleteImage(desktop.storagePath);
      if (mobile?.storagePath) await this.admin.deleteImage(mobile.storagePath);

      this.desktopPending.set(null);
      this.mobilePending.set(null);
      this.desktopPreview.set(null);
      this.mobilePreview.set(null);
      this.desktopInfo.set(null);
      this.mobileInfo.set(null);
      this.showMessage('Pending changes discarded — preview restored to the published banner.');
    } catch {
      this.error.set('Could not discard the pending images. Please try again.');
    }
  }

  saveChanges(): void {
    void this.save(false);
  }

  publish(): void {
    void this.save(true);
  }

  private async save(publish: boolean): Promise<void> {
    if (this.saving() || this.publishing()) return;
    if (publish && !this.hasDesktopImage()) {
      this.error.set('A desktop banner image is required before publishing.');
      return;
    }

    this.error.set(null);
    this.message.set(null);
    if (publish) this.publishing.set(true); else this.saving.set(true);

    try {
      const current = this.current();
      const desktop = this.desktopPending();
      const mobile = this.mobilePending();

      const payload: HeroBannerSavePayload = {
        desktopImageUrl: desktop?.url ?? current?.desktopImageUrl ?? '',
        mobileImageUrl: mobile?.url ?? current?.mobileImageUrl ?? '',
        desktopStoragePath: desktop?.storagePath ?? current?.desktopStoragePath ?? '',
        mobileStoragePath: mobile?.storagePath ?? current?.mobileStoragePath ?? '',
        isPublished: publish ? true : (current?.isPublished ?? false),
      };

      const saved = await this.admin.save(payload);
      this.current.set(saved);
      this.desktopPending.set(null);
      this.mobilePending.set(null);
      this.desktopPreview.set(null);
      this.mobilePreview.set(null);
      this.desktopInfo.set(null);
      this.mobileInfo.set(null);
      this.showMessage(
        publish
          ? 'Banner published — the website now shows the new banner immediately.'
          : 'Changes saved. The website keeps showing the ' + (saved.isPublished ? 'published banner.' : 'default banner until you publish.'),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
      this.publishing.set(false);
    }
  }

  private showMessage(text: string): void {
    this.message.set(text);
    setTimeout(() => {
      if (this.message() === text) this.message.set(null);
    }, 5000);
  }

  private hasDesktopImage(): boolean {
    return !!(this.desktopPending()?.url || this.current()?.desktopImageUrl);
  }
}
