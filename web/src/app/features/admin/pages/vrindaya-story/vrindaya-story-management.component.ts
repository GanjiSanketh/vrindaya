import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VrindayaStoryAdminService } from '../../services/vrindaya-story-admin.service';
import {
  VrindayaStoryItem,
  VrindayaStoryPosition,
  VrindayaStorySavePayload,
  VRINDAYA_STORY_POSITIONS,
  DEFAULT_VRINDAYA_STORY_ITEMS,
} from '../../../../core/models/vrindaya-story.model';
import {
  validateImageFile,
  processImageForUpload,
  formatFileSize,
} from '../../../../shared/utils/image-processing.util';
import { ToastService } from '../../../../shared/services/toast.service';

/** Working copy of a story beat plus transient UI state (preview/upload). */
interface DraftItem {
  storyId: string;
  storyNumber: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: VrindayaStoryPosition;
  displayOrder: number;
  isActive: boolean;
  storagePath: string;
  preview: string | null;
  uploading: boolean;
}

/** A staged file in the change-image modal, before it is uploaded. */
interface StagedFile {
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  previewUrl: string;
  /** The processed WebP blob — uploaded as-is when the admin saves. */
  blob: Blob;
}

function toDraft(item: VrindayaStoryItem): DraftItem {
  return { ...item, preview: null, uploading: false };
}

/**
 * Vrindaya Story Management — the CMS screen that drives the homepage brand
 * storytelling section. Each story beat shows its current image (with the
 * object-position applied), editable title/description, an image-position
 * picker and an active toggle. "Change Image" opens a modal with drag &
 * drop / browse, instant client-side processing, validation and preview;
 * saving the modal stages the upload (storage only — nothing goes live).
 * The sticky "Save Story" action publishes the full configuration through
 * the API, which writes homepageConfig/active.vrindayaStory and cleans up
 * replaced images. The storefront reads that document directly, so the
 * public site picks the new images up without any code change.
 */
@Component({
  selector: 'app-vrindaya-story-management',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './vrindaya-story-management.component.html',
  styleUrl: './vrindaya-story-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VrindayaStoryManagementComponent implements OnInit {
  private readonly admin = inject(VrindayaStoryAdminService);
  private readonly toast = inject(ToastService);

  readonly positions = VRINDAYA_STORY_POSITIONS;
  readonly formatSize = formatFileSize;

  /** The last persisted configuration (for dirty detection). */
  private readonly saved = signal<Record<string, VrindayaStoryItem> | null>(null);

  // ── Story beats ──
  readonly items = signal<DraftItem[]>([]);

  // ── Change-image modal ──
  readonly modalOpen = signal(false);
  readonly modalItemId = signal<string | null>(null);
  readonly stagedFile = signal<StagedFile | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly modalUploading = signal(false);
  readonly dragOver = signal(false);

  // ── Page state ──
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly justSaved = signal(false);

  readonly modalItem = computed<DraftItem | null>(() => {
    const id = this.modalItemId();
    if (!id) return null;
    return this.items().find(i => i.storyId === id) ?? null;
  });

  /** Story ids with unsaved edits since the last save. */
  readonly changedIds = computed<Set<string>>(() => {
    const saved = this.saved();
    if (!saved) return new Set();
    const changed = new Set<string>();
    for (const item of this.items()) {
      const prev = saved[item.storyId];
      if (!prev) { changed.add(item.storyId); continue; }
      if (prev.imageUrl !== item.imageUrl
        || prev.imagePosition !== item.imagePosition
        || prev.title !== item.title
        || prev.description !== item.description
        || prev.isActive !== item.isActive) {
        changed.add(item.storyId);
      }
    }
    return changed;
  });

  readonly dirty = computed(() => this.changedIds().size > 0);
  readonly changedCount = computed(() => this.changedIds().size);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const config = await this.admin.getConfig();
      if (config && config.items.length > 0) {
        const ordered = [...config.items].sort((a, b) => a.displayOrder - b.displayOrder);
        this.items.set(ordered.map(toDraft));
        this.saved.set(Object.fromEntries(ordered.map(i => [i.storyId, i])));
      } else {
        // Never published — seed the form with the current public defaults so
        // the first save simply publishes what visitors already see.
        const seeds = DEFAULT_VRINDAYA_STORY_ITEMS.map((d, index) => toDraft({
          ...d,
          displayOrder: index + 1,
          isActive: true,
          storagePath: '',
          createdAt: '',
          updatedAt: '',
        }));
        this.items.set(seeds);
        this.saved.set(null);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the Vrindaya Story configuration.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Draft mutations ──

  private patchItem(storyId: string, patch: Partial<DraftItem>): void {
    this.items.update(list => list.map(i => (i.storyId === storyId ? { ...i, ...patch } : i)));
  }

  onTitleChange(storyId: string, value: string): void {
    this.patchItem(storyId, { title: value });
    this.markChanged();
  }

  onDescriptionChange(storyId: string, value: string): void {
    this.patchItem(storyId, { description: value });
    this.markChanged();
  }

  onPositionChange(storyId: string, value: string): void {
    const position = value as VrindayaStoryPosition;
    if (this.positions.includes(position)) {
      this.patchItem(storyId, { imagePosition: position });
      this.markChanged();
    }
  }

  toggleActive(storyId: string, active: boolean): void {
    this.patchItem(storyId, { isActive: active });
    this.markChanged();
  }

  /** Dismisses the transient "saved" banner as soon as anything changes again. */
  private markChanged(): void {
    this.justSaved.set(false);
    this.message.set(null);
  }

  // ── Change-image modal ──

  openChangeImage(storyId: string): void {
    this.releaseStagedFile();
    this.modalItemId.set(storyId);
    this.modalError.set(null);
    this.modalUploading.set(false);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.modalUploading()) return;
    this.releaseStagedFile();
    this.modalOpen.set(false);
    this.modalItemId.set(null);
    this.modalError.set(null);
  }

  onBrowseFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.stageFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  /** Drops the staged file without uploading it. */
  releaseStaged(): void {
    if (this.modalUploading()) return;
    this.releaseStagedFile();
    this.modalError.set(null);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.stageFile(file);
  }

  private async stageFile(file: File): Promise<void> {
    const validationError = validateImageFile(file);
    if (validationError) {
      this.modalError.set(validationError);
      this.releaseStagedFile();
      return;
    }
    this.modalError.set(null);

    try {
      // Processed client-side: resized, re-encoded to WebP, compressed.
      const processed = await processImageForUpload(file, { maxWidth: 2000, targetMaxBytes: 700 * 1024 });
      this.releaseStagedFile();
      this.stagedFile.set({
        fileName: file.name,
        sizeBytes: processed.sizeBytes,
        width: processed.width,
        height: processed.height,
        previewUrl: processed.previewUrl,
        blob: processed.blob,
      });
    } catch (err) {
      this.modalError.set(err instanceof Error ? err.message : 'Could not read that image. Try another file.');
      this.releaseStagedFile();
    }
  }

  /** Uploads the staged file and patches the draft — storage only, nothing live until "Save Story". */
  async saveStagedImage(): Promise<void> {
    const staged = this.stagedFile();
    const item = this.modalItem();
    if (!staged || !item || this.modalUploading()) return;

    this.modalUploading.set(true);
    this.modalError.set(null);
    try {
      const uploaded = await this.admin.uploadImage(
        new File([staged.blob], staged.fileName, { type: 'image/webp' }),
      );
      this.patchItem(item.storyId, {
        imageUrl: uploaded.url,
        storagePath: uploaded.storagePath,
      });
      this.markChanged();
      this.toast.success('Story image updated successfully');
      this.closeModal();
    } catch (err) {
      this.modalError.set(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      this.modalUploading.set(false);
    }
  }

  private releaseStagedFile(): void {
    const staged = this.stagedFile();
    if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    this.stagedFile.set(null);
  }

  // ── Save ──

  async save(): Promise<void> {
    if (this.saving()) return;

    // Keep blanks out of the payload — the storefront falls back to the
    // built-in copy, so an empty field never renders as dead space.
    const payload: VrindayaStorySavePayload = {
      items: this.items()
        .map((item, index) => ({
          storyId: item.storyId,
          storyNumber: item.storyNumber || String(index + 1).padStart(2, '0'),
          title: item.title.trim(),
          description: item.description.trim(),
          imageUrl: item.imageUrl.trim(),
          imageAlt: item.imageAlt.trim(),
          imagePosition: item.imagePosition,
          displayOrder: index + 1,
          isActive: item.isActive,
          storagePath: item.storagePath.trim(),
        })),
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      const saved = await this.admin.save(payload);
      const ordered = [...saved.items].sort((a, b) => a.displayOrder - b.displayOrder);
      this.items.set(ordered.map(toDraft));
      this.saved.set(Object.fromEntries(ordered.map(i => [i.storyId, i])));
      this.justSaved.set(true);
      this.message.set('Vrindaya Story saved — the website now uses the updated images.');
      this.toast.success('Vrindaya Story saved successfully');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
      this.toast.error('Could not save the Vrindaya Story');
    } finally {
      this.saving.set(false);
    }
  }
}
