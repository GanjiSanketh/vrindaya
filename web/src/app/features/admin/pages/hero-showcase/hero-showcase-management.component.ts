import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ElementRef, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroShowcaseAdminService } from '../../services/hero-showcase-admin.service';
import {
  HeroShowcase,
  HeroShowcaseItem,
  HeroShowcasePosition,
  HeroShowcaseSavePayload,
  HERO_SHOWCASE_POSITIONS,
} from '../../../../core/models/hero-showcase.model';
import {
  validateImageFile,
  processImageForUpload,
  formatFileSize,
} from '../../../../shared/utils/image-processing.util';
import { ToastService } from '../../../../shared/services/toast.service';
import { CloudinaryUrlPipe } from '../../../../shared/pipes/cloudinary-url.pipe';

const MAX_ITEMS = 10;
const MAX_TITLE = 80;
const MAX_SUBTITLE = 200;
const MAX_BUTTON_TEXT = 40;
const MAX_BUTTON_LINK = 120;

type ImageTarget = 'desktop' | 'mobile';
type Device = 'desktop' | 'mobile';

/** Working copy of a showcase slide. */
interface DraftItem {
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
  createdAt: string;
  updatedAt: string;
}

/** A file staged in the slide editor, before it is uploaded. */
interface StagedFile {
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  previewUrl: string;
  blob: Blob;
}

/** Data the Live Preview panel renders for the selected slide. */
interface PreviewData {
  itemId: string;
  image: string;
  mobileImage: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  position: HeroShowcasePosition;
}

function toDraft(item: HeroShowcaseItem): DraftItem {
  return {
    itemId: item.itemId,
    imageUrl: item.imageUrl,
    storagePath: item.storagePath,
    mobileImageUrl: item.mobileImageUrl,
    mobileStoragePath: item.mobileStoragePath,
    imagePosition: item.imagePosition ?? 'center',
    title: item.title,
    subtitle: item.subtitle,
    buttonText: item.buttonText,
    buttonLink: item.buttonLink,
    displayOrder: item.displayOrder,
    enabled: item.enabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toPayloadItem(item: DraftItem): HeroShowcaseItem {
  return {
    itemId: item.itemId,
    imageUrl: item.imageUrl,
    storagePath: item.storagePath,
    mobileImageUrl: item.mobileImageUrl,
    mobileStoragePath: item.mobileStoragePath,
    imagePosition: item.imagePosition,
    title: item.title,
    subtitle: item.subtitle,
    buttonText: item.buttonText,
    buttonLink: item.buttonLink,
    displayOrder: item.displayOrder,
    enabled: item.enabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Hero Showcase Management — the CMS screen that drives the homepage hero.
 *
 * The whole page is ONE editable document: global settings plus up to 10
 * ordered slides are edited in a compact slide list (drag to reorder) and a
 * two-column slide editor (content left, realistic hero preview right), then
 * published with a single "Save Changes" action in the sticky action bar.
 * Uploads are staged in the editor (client-side processed to WebP) and only
 * hit storage when the slide is saved; nothing goes live until "Save
 * Changes", at which point the API writes homepageConfig/active and cleans
 * up replaced assets.
 */
@Component({
  selector: 'app-hero-showcase-management',
  standalone: true,
  imports: [RouterLink, CloudinaryUrlPipe],
  templateUrl: './hero-showcase-management.component.html',
  styleUrl: './hero-showcase-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroShowcaseManagementComponent implements OnInit {
  private readonly admin = inject(HeroShowcaseAdminService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxItems = MAX_ITEMS;
  readonly maxTitle = MAX_TITLE;
  readonly maxSubtitle = MAX_SUBTITLE;
  readonly maxButtonText = MAX_BUTTON_TEXT;
  readonly maxButtonLink = MAX_BUTTON_LINK;
  readonly positions = HERO_SHOWCASE_POSITIONS;
  readonly formatSize = formatFileSize;

  /** The last persisted configuration. */
  readonly current = signal<HeroShowcase | null>(null);

  // ── Settings form state ──
  readonly enabled = signal(false);
  readonly autoplay = signal(false);
  readonly pauseOnHover = signal(false);
  readonly rotationInterval = signal(8);
  readonly transition = signal<'fade' | 'slide' | 'scaleFade'>('fade');

  // ── Slides ──
  readonly items = signal<DraftItem[]>([]);

  // ── Live preview ──
  readonly previewIndex = signal(0);
  readonly previewDevice = signal<Device>('desktop');

  // ── UI state ──
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly justSaved = signal(false);
  readonly draggingIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

  /** Which slide row's "⋯" menu is open. */
  readonly openMenuId = signal<string | null>(null);
  /** Slide awaiting delete confirmation. */
  readonly deleteTarget = signal<DraftItem | null>(null);
  /** Images that failed to load — shows a premium placeholder instead of a broken icon. */
  readonly failedImages = signal<Set<string>>(new Set());

  // ── Slide editor modal ──
  readonly editorOpen = signal(false);
  readonly editorDraft = signal<DraftItem | null>(null);
  readonly editorStaged = signal<StagedFile | null>(null);
  readonly editorMobileStaged = signal<StagedFile | null>(null);
  readonly editorUploading = signal(false);
  readonly editorError = signal<string | null>(null);

  readonly canAdd = computed(() => this.items().length < MAX_ITEMS);
  readonly hasItems = computed(() => this.items().length > 0);
  readonly enabledItems = computed(() => this.items().filter(i => i.enabled).length);

  readonly dirty = computed(() => {
    const saved = this.current();
    if (!saved) return this.enabled() || this.autoplay() || this.pauseOnHover() || this.rotationInterval() !== 8
      || this.transition() !== 'fade' || this.items().length > 0;
    const snapshot = {
      enabled: this.enabled(), autoplay: this.autoplay(), pauseOnHover: this.pauseOnHover(),
      rotationIntervalSeconds: this.rotationInterval(), transition: this.transition(),
      items: this.items().map(toPayloadItem).sort((a, b) => a.displayOrder - b.displayOrder),
    };
    const baseline = {
      enabled: saved.enabled, autoplay: saved.autoplay, pauseOnHover: saved.pauseOnHover,
      rotationIntervalSeconds: saved.rotationIntervalSeconds, transition: saved.transition,
      items: [...saved.items].sort((a, b) => a.displayOrder - b.displayOrder),
    };
    return JSON.stringify(snapshot) !== JSON.stringify(baseline);
  });

  /** Slides the preview can show — enabled, with an image, in display order. */
  readonly previewSlides = computed<DraftItem[]>(() =>
    this.items()
      .filter(i => i.enabled && (i.imageUrl?.trim() || i.mobileImageUrl?.trim()))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );

  /** The slide currently shown in the Live Preview panel. */
  readonly preview = computed<PreviewData | null>(() => {
    const list = this.previewSlides();
    if (!list.length) return null;
    const slide = list[this.previewIndex() % list.length];
    return {
      itemId: slide.itemId,
      image: slide.imageUrl?.trim() || slide.mobileImageUrl?.trim(),
      mobileImage: slide.mobileImageUrl?.trim() || slide.imageUrl?.trim(),
      title: slide.title?.trim() || 'Wear the Grace',
      subtitle: slide.subtitle?.trim() || '',
      buttonText: slide.buttonText?.trim() || 'Shop Now',
      buttonLink: slide.buttonLink?.trim() || '/shop',
      position: slide.imagePosition,
    };
  });

  /** The slide shown inside the editor's live preview pane. */
  readonly editorPreview = computed<PreviewData | null>(() => {
    const draft = this.editorDraft();
    if (!draft) return null;
    const staged = this.editorStaged();
    const mobileStaged = this.editorMobileStaged();
    return {
      itemId: draft.itemId,
      image: staged?.previewUrl || draft.imageUrl?.trim() || mobileStaged?.previewUrl || draft.mobileImageUrl?.trim(),
      mobileImage: mobileStaged?.previewUrl || draft.mobileImageUrl?.trim() || staged?.previewUrl || draft.imageUrl?.trim(),
      title: draft.title?.trim() || 'Wear the Grace',
      subtitle: draft.subtitle?.trim() || '',
      buttonText: draft.buttonText?.trim() || 'Shop Now',
      buttonLink: draft.buttonLink?.trim() || '/shop',
      position: draft.imagePosition,
    };
  });

  /** Relative "Last saved" label for the page header. */
  readonly lastSavedText = computed(() => {
    const updatedAt = this.current()?.updatedAt;
    if (!updatedAt) return 'Never saved';
    const then = new Date(updatedAt).getTime();
    if (!Number.isFinite(then)) return 'Last saved';
    const diff = Date.now() - then;
    if (diff < 60_000) return 'Last saved just now';
    if (diff < 3_600_000) return `Last saved ${Math.max(1, Math.round(diff / 60_000))} min ago`;
    if (diff < 86_400_000) return `Last saved ${Math.round(diff / 3_600_000)} hr ago`;
    return 'Last saved ' + new Date(updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const config = await this.admin.getConfig();
      this.applyConfig(config);
    } catch {
      this.error.set('Could not load the hero showcase configuration.');
    } finally {
      this.loading.set(false);
    }
  }

  private applyConfig(config: HeroShowcase | null): void {
    this.current.set(config);
    this.previewIndex.set(0);
    this.openMenuId.set(null);
    this.deleteTarget.set(null);
    this.closeEditor();
    if (!config) {
      this.enabled.set(false);
      this.autoplay.set(false);
      this.pauseOnHover.set(false);
      this.rotationInterval.set(8);
      this.transition.set('fade');
      this.items.set([]);
      return;
    }
    this.enabled.set(config.enabled);
    this.autoplay.set(config.autoplay);
    this.pauseOnHover.set(config.pauseOnHover);
    this.rotationInterval.set(config.rotationIntervalSeconds);
    this.transition.set(config.transition);
    this.items.set([...config.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toDraft));
  }

  // ── Settings helpers ──
  setInterval(raw: string): void {
    const n = Number.parseInt(raw, 10);
    this.rotationInterval.set(Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 8);
  }

  setTransition(value: string): void {
    this.transition.set(value === 'slide' || value === 'scaleFade' ? value : 'fade');
  }

  // ── Slide CRUD ──
  addSlide(): void {
    if (!this.canAdd()) {
      this.error.set(`A hero showcase can have at most ${MAX_ITEMS} slides.`);
      return;
    }
    this.error.set(null);
    const id = this.newId();
    this.items.update(list => [
      ...list,
      {
        itemId: id,
        imageUrl: '',
        storagePath: '',
        mobileImageUrl: '',
        mobileStoragePath: '',
        imagePosition: 'center',
        title: '',
        subtitle: '',
        buttonText: 'Shop Now',
        buttonLink: '/shop',
        displayOrder: list.length + 1,
        enabled: true,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    this.openEditor(this.items().find(i => i.itemId === id)!);
  }

  duplicateSlide(item: DraftItem): void {
    if (!this.canAdd()) {
      this.error.set(`A hero showcase can have at most ${MAX_ITEMS} slides.`);
      return;
    }
    const id = this.newId();
    this.items.update(list => {
      const at = list.findIndex(i => i.itemId === item.itemId);
      const clone: DraftItem = {
        ...toPayloadItem(item),
        itemId: id,
        title: item.title ? `${item.title} (Copy)` : '',
      };
      const next = [...list];
      next.splice(at + 1, 0, clone);
      return this.reindex(next);
    });
    this.openEditor(this.items().find(i => i.itemId === id)!);
  }

  removeSlide(itemId: string): void {
    this.items.update(list => this.reindex(list.filter(i => i.itemId !== itemId)));
    this.deleteTarget.set(null);
    this.openMenuId.set(null);
  }

  toggleSlideEnabled(item: DraftItem): void {
    this.patchItem(item.itemId, 'enabled', !item.enabled);
  }

  patchItem<K extends keyof DraftItem>(itemId: string, field: K, value: DraftItem[K]): void {
    this.items.update(list => list.map(i => (i.itemId === itemId ? { ...i, [field]: value } as DraftItem : i)));
  }

  /** Marks an image as failed to load so the UI swaps in a premium placeholder. */
  markImageFailed(key: string): void {
    this.failedImages.update(set => {
      const next = new Set(set);
      next.add(key);
      return next;
    });
  }

  private clearFailed(key: string): void {
    this.failedImages.update(set => {
      if (!set.has(key)) return set;
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }

  // ── Row action menu ──
  toggleMenu(itemId: string): void {
    this.openMenuId.update(id => (id === itemId ? null : itemId));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Delete confirmation ──
  requestDelete(item: DraftItem): void {
    this.deleteTarget.set(item);
    this.openMenuId.set(null);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  // ── Drag & drop ordering ──
  onDragStart(index: number, event: DragEvent): void {
    this.draggingIndex.set(index);
    this.dragOverIndex.set(null);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(index: number, event: DragEvent): void {
    if (this.draggingIndex() === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dragOverIndex() !== index) this.dragOverIndex.set(index);
  }

  onDrop(index: number, event: DragEvent): void {
    event.preventDefault();
    const from = this.draggingIndex();
    this.draggingIndex.set(null);
    this.dragOverIndex.set(null);
    if (from === null || from === index) return;
    this.items.update(list => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return this.reindex(next);
    });
  }

  onDragEnd(): void {
    this.draggingIndex.set(null);
    this.dragOverIndex.set(null);
  }

  moveSlide(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= this.items().length) return;
    this.items.update(list => {
      const next = [...list];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return this.reindex(next);
    });
    this.openMenuId.set(null);
  }

  private reindex(list: DraftItem[]): DraftItem[] {
    return list.map((item, index) => ({ ...item, displayOrder: index + 1 }));
  }

  // ── Slide editor modal ──
  openEditor(item: DraftItem): void {
    this.releaseStaged('desktop');
    this.releaseStaged('mobile');
    this.editorError.set(null);
    this.editorUploading.set(false);
    this.editorDraft.set({ ...item });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    if (this.editorUploading()) return;
    this.releaseStaged('desktop');
    this.releaseStaged('mobile');
    this.editorOpen.set(false);
    this.editorDraft.set(null);
    this.editorError.set(null);
  }

  patchEditor<K extends keyof DraftItem>(field: K, value: DraftItem[K]): void {
    this.editorDraft.update(d => (d ? { ...d, [field]: value } as DraftItem : d));
  }

  onEditorBrowse(input: HTMLInputElement, target: ImageTarget): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.stageEditorFile(file, target);
  }

  onEditorDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  onEditorDrop(event: DragEvent, target: ImageTarget): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.stageEditorFile(file, target);
  }

  private async stageEditorFile(file: File, target: ImageTarget): Promise<void> {
    const validationError = validateImageFile(file);
    if (validationError) {
      this.editorError.set(validationError);
      return;
    }
    this.editorError.set(null);

    try {
      // Processed client-side: resized, re-encoded to WebP, compressed.
      const processed = await processImageForUpload(file, { maxWidth: 2000, targetMaxBytes: 700 * 1024 });
      this.releaseStaged(target);
      const staged: StagedFile = {
        fileName: file.name,
        sizeBytes: processed.sizeBytes,
        width: processed.width,
        height: processed.height,
        previewUrl: processed.previewUrl,
        blob: processed.blob,
      };
      if (target === 'mobile') this.editorMobileStaged.set(staged);
      else this.editorStaged.set(staged);
    } catch (err) {
      this.editorError.set(err instanceof Error ? err.message : 'Could not read that image. Try another file.');
    }
  }

  releaseStaged(target: ImageTarget): void {
    const staged = target === 'mobile' ? this.editorMobileStaged() : this.editorStaged();
    if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    if (target === 'mobile') this.editorMobileStaged.set(null);
    else this.editorStaged.set(null);
  }

  /** Removes the current stored image for one target from the draft. */
  removeEditorImage(target: ImageTarget): void {
    const draft = this.editorDraft();
    if (!draft) return;
    if (target === 'mobile') {
      this.patchEditor('mobileImageUrl', '');
      this.patchEditor('mobileStoragePath', '');
      this.clearFailed(`${draft.itemId}:m`);
    } else {
      this.patchEditor('imageUrl', '');
      this.patchEditor('storagePath', '');
      this.clearFailed(`${draft.itemId}:d`);
    }
  }

  /** Uploads staged files, commits the draft into the slide list and closes the editor. */
  async saveEditorSlide(): Promise<void> {
    const draft = this.editorDraft();
    if (!draft || this.editorUploading()) return;

    this.editorUploading.set(true);
    this.editorError.set(null);
    try {
      const desktopStaged = this.editorStaged();
      const mobileStaged = this.editorMobileStaged();
      let imageUrl = draft.imageUrl;
      let storagePath = draft.storagePath;
      let mobileImageUrl = draft.mobileImageUrl;
      let mobileStoragePath = draft.mobileStoragePath;

      if (desktopStaged) {
        const uploaded = await this.admin.uploadImage(new File([desktopStaged.blob], desktopStaged.fileName, { type: 'image/webp' }));
        imageUrl = uploaded.url;
        storagePath = uploaded.storagePath;
      }
      if (mobileStaged) {
        const uploaded = await this.admin.uploadImage(new File([mobileStaged.blob], mobileStaged.fileName, { type: 'image/webp' }));
        mobileImageUrl = uploaded.url;
        mobileStoragePath = uploaded.storagePath;
      }

      const committed: DraftItem = { ...draft, imageUrl, storagePath, mobileImageUrl, mobileStoragePath };
      this.items.update(list => list.map(i => (i.itemId === committed.itemId ? committed : i)));
      this.clearFailed(`${draft.itemId}:d`);
      this.clearFailed(`${draft.itemId}:m`);
      this.releaseStaged('desktop');
      this.releaseStaged('mobile');
      this.editorOpen.set(false);
      this.editorDraft.set(null);
      this.toast.success('Slide saved to draft — click Save Changes to publish');
    } catch (err) {
      this.editorError.set(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      this.editorUploading.set(false);
    }
  }

  // ── Preview ──
  selectPreview(index: number): void {
    const len = this.previewSlides().length;
    if (!len) return;
    this.previewIndex.set(((index % len) + len) % len);
  }

  prevPreview(): void {
    this.selectPreview(this.previewIndex() - 1);
  }

  nextPreview(): void {
    this.selectPreview(this.previewIndex() + 1);
  }

  /** "Preview" row action — jumps the Live Preview panel to this slide. */
  previewSlideFromList(itemId: string): void {
    const idx = this.previewSlides().findIndex(i => i.itemId === itemId);
    if (idx >= 0) this.previewIndex.set(idx);
    this.openMenuId.set(null);
    const panel = this.el.nativeElement.querySelector('.hsc-preview-section') as HTMLElement | null;
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Save / discard ──
  saveChanges(): void {
    void this.save();
  }

  discard(): void {
    this.applyConfig(this.current());
    this.error.set(null);
    this.message.set(null);
  }

  private async save(): Promise<void> {
    if (this.saving()) return;
    if (this.items().length === 0) {
      this.error.set('Add at least one slide before saving.');
      return;
    }
    if (this.editorOpen()) {
      this.error.set('Finish or cancel the slide editor before saving.');
      return;
    }

    this.error.set(null);
    this.message.set(null);
    this.saving.set(true);

    const payload: HeroShowcaseSavePayload = {
      enabled: this.enabled(),
      autoplay: this.autoplay(),
      pauseOnHover: this.pauseOnHover(),
      rotationIntervalSeconds: this.rotationInterval(),
      transition: this.transition(),
      items: this.reindex(this.items()).map(i => ({
        itemId: i.itemId,
        imageUrl: i.imageUrl,
        storagePath: i.storagePath,
        mobileImageUrl: i.mobileImageUrl,
        mobileStoragePath: i.mobileStoragePath,
        imagePosition: i.imagePosition,
        title: i.title.trim(),
        subtitle: i.subtitle.trim(),
        buttonText: i.buttonText.trim(),
        buttonLink: i.buttonLink.trim(),
        displayOrder: i.displayOrder,
        enabled: i.enabled,
      })),
    };

    try {
      const saved = await this.admin.save(payload);
      this.current.set(saved);
      this.items.set(this.reindex(this.items()).map(toDraft));
      this.justSaved.set(true);
      setTimeout(() => {
        if (this.justSaved()) this.justSaved.set(false);
      }, 4000);
      this.toast.success('Hero Showcase updated');
      this.showMessage(saved.enabled
        ? 'All changes saved — the website now shows the Hero Showcase.'
        : 'All changes saved — Hero Showcase is off, so the website shows the fallback Hero Banner.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
      this.toast.error('Could not save the Hero Showcase');
    } finally {
      this.saving.set(false);
    }
  }

  /** Route-guard hook — warns before leaving with unsaved edits. */
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  // ── Misc ──
  private showMessage(text: string): void {
    this.message.set(text);
    setTimeout(() => {
      if (this.message() === text) this.message.set(null);
    }, 5000);
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      const staged = this.editorStaged();
      if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
      const mobile = this.editorMobileStaged();
      if (mobile?.previewUrl) URL.revokeObjectURL(mobile.previewUrl);
    });
  }
}
