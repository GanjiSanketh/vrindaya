import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroShowcaseAdminService } from '../../services/hero-showcase-admin.service';
import { HeroShowcase, HeroShowcaseItem, HeroShowcaseSavePayload } from '../../../../core/models/hero-showcase.model';
import { validateImageFile, processImageForUpload } from '../../../../shared/utils/image-processing.util';

const MAX_ITEMS = 10;

/** Working copy of a showcase slide plus transient UI state (preview/upload). */
interface DraftItem {
  itemId: string;
  imageUrl: string;
  storagePath: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  displayOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  preview: string | null;
  uploading: boolean;
}

/** Data the Live Preview panel renders for the currently selected slide. */
interface PreviewData {
  itemId: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

function toDraft(item: HeroShowcaseItem): DraftItem {
  return { ...item, preview: null, uploading: false };
}

function toPayloadItem(item: DraftItem): HeroShowcaseItem {
  return {
    itemId: item.itemId,
    imageUrl: item.imageUrl,
    storagePath: item.storagePath,
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
 * The whole page is ONE editable document: global settings (enable/autoplay/
 * pause-on-hover/rotation interval/transition) plus up to 10 ordered slides
 * (per-slide image upload/replace/remove, text fields, visibility) are edited
 * together and published with a single "Save Changes" action in the sticky
 * bottom bar. A dirty-state indicator tracks unsaved edits; a live Desktop +
 * Mobile preview reflects the current draft as you type. Uploads hit the API
 * (storage only, via the shared ICloudinaryService — no Firestore write), so
 * nothing is ever live until the admin saves.
 */
@Component({
  selector: 'app-hero-showcase-management',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero-showcase-management.component.html',
  styleUrl: './hero-showcase-management.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroShowcaseManagementComponent implements OnInit {
  private readonly admin = inject(HeroShowcaseAdminService);

  readonly maxItems = MAX_ITEMS;

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
  /** Collapsed slide ids — collapsed cards show only their header. */
  readonly collapsedIds = signal<Set<string>>(new Set());

  // ── Live preview ──
  readonly previewIndex = signal(0);

  // ── UI state ──
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly justSaved = signal(false);
  readonly draggingIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

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
      .filter(i => i.enabled && (i.imageUrl?.trim() || i.preview))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );

  /** The slide currently shown in the Live Preview panel. */
  readonly preview = computed<PreviewData | null>(() => {
    const list = this.previewSlides();
    if (!list.length) return null;
    const slide = list[this.previewIndex() % list.length];
    return {
      itemId: slide.itemId,
      image: (slide.preview || slide.imageUrl).trim(),
      title: slide.title?.trim() || 'Wear the Grace',
      subtitle: slide.subtitle?.trim() || '',
      buttonText: slide.buttonText?.trim() || 'Shop Now',
      buttonLink: slide.buttonLink?.trim() || '/shop',
    };
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
    if (!config) {
      this.enabled.set(false);
      this.autoplay.set(false);
      this.pauseOnHover.set(false);
      this.rotationInterval.set(8);
      this.transition.set('fade');
      this.items.set([]);
      this.collapsedIds.set(new Set());
      return;
    }
    this.enabled.set(config.enabled);
    this.autoplay.set(config.autoplay);
    this.pauseOnHover.set(config.pauseOnHover);
    this.rotationInterval.set(config.rotationIntervalSeconds);
    this.transition.set(config.transition);
    const sorted = [...config.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toDraft);
    this.items.set(sorted);
    // First slide open, the rest collapsed — keeps a long list scannable.
    this.collapsedIds.set(new Set(sorted.slice(1).map(i => i.itemId)));
  }

  // ── Settings helpers ──
  setInterval(raw: string): void {
    const n = Number.parseInt(raw, 10);
    this.rotationInterval.set(Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 8);
  }

  setTransition(value: string): void {
    this.transition.set(value === 'slide' || value === 'scaleFade' ? value : 'fade');
  }

  // ── Slide expand / collapse ──
  isCollapsed(itemId: string): boolean {
    return this.collapsedIds().has(itemId);
  }

  toggleExpanded(itemId: string): void {
    this.collapsedIds.update(set => {
      const next = new Set(set);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
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
        title: '',
        subtitle: '',
        buttonText: 'Shop Now',
        buttonLink: '/shop',
        displayOrder: list.length + 1,
        enabled: true,
        createdAt: '',
        updatedAt: '',
        preview: null,
        uploading: false,
      },
    ]);
    // A freshly added slide opens expanded so the admin can fill it in.
    this.collapsedIds.update(set => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  removeSlide(itemId: string): void {
    const item = this.items().find(i => i.itemId === itemId);
    if (!item) return;
    if (item.preview) URL.revokeObjectURL(item.preview);
    if (item.storagePath) void this.deleteStoredImage(item.storagePath);
    this.items.update(list => {
      const next = list.filter(i => i.itemId !== itemId);
      return this.reindex(next);
    });
    this.collapsedIds.update(set => {
      const next = new Set(set);
      next.delete(itemId);
      return next;
    });
  }

  removeImage(itemId: string): void {
    const item = this.items().find(i => i.itemId === itemId);
    if (!item) return;
    if (item.storagePath) void this.deleteStoredImage(item.storagePath);
    this.patchItem(item, 'storagePath', '');
    this.patchItem(item, 'imageUrl', '');
    if (item.preview) {
      URL.revokeObjectURL(item.preview);
      this.patchItem(item, 'preview', null);
    }
  }

  patchItem<K extends keyof DraftItem>(item: DraftItem, field: K, value: DraftItem[K]): void {
    this.items.update(list => list.map(i => (i.itemId === item.itemId ? { ...i, [field]: value } as DraftItem : i)));
  }

  toggleSlideEnabled(item: DraftItem): void {
    this.patchItem(item, 'enabled', !item.enabled);
  }

  // ── Upload / replace ──
  onFileSelected(item: DraftItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void this.uploadFor(item, file);
  }

  private async uploadFor(item: DraftItem, file: File): Promise<void> {
    const validationError = validateImageFile(file);
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    this.error.set(null);

    const objectUrl = URL.createObjectURL(file);
    this.patchItem(item, 'preview', objectUrl);
    this.patchItem(item, 'uploading', true);

    try {
      const processed = await processImageForUpload(file);
      const uploaded = await this.admin.uploadImage(
        new File([processed.blob], file.name, { type: 'image/webp' }),
      );

      URL.revokeObjectURL(objectUrl);
      this.patchItem(item, 'uploading', false);
      this.patchItem(item, 'preview', null);
      const previous = this.items().find(i => i.itemId === item.itemId);
      this.patchItem(item, 'imageUrl', uploaded.url);
      this.patchItem(item, 'storagePath', uploaded.storagePath);
      if (previous?.storagePath && previous.storagePath !== uploaded.storagePath) {
        void this.deleteStoredImage(previous.storagePath);
      }
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      this.patchItem(item, 'uploading', false);
      this.patchItem(item, 'preview', null);
      this.error.set(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }

  private async deleteStoredImage(storagePath: string): Promise<void> {
    try {
      await this.admin.deleteImage(storagePath);
    } catch {
      // Best-effort — a failure only leaves an orphaned asset in storage.
    }
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
  }

  private reindex(list: DraftItem[]): DraftItem[] {
    return list.map((item, index) => ({ ...item, displayOrder: index + 1 }));
  }

  // ── Preview ──
  selectPreview(index: number): void {
    const len = this.previewSlides().length;
    if (!len) return;
    this.previewIndex.set(((index % len) + len) % len);
  }

  // ── Save / cancel ──
  saveChanges(): void {
    void this.save();
  }

  cancel(): void {
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
    if (this.items().some(i => i.uploading)) {
      this.error.set('Wait for image uploads to finish before saving.');
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
      this.showMessage(saved.enabled
        ? 'All changes saved — the website now shows the Hero Showcase.'
        : 'All changes saved — Hero Showcase is off, so the website shows the fallback Hero Banner.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
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
}
