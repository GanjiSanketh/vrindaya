import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { ImageDirectorService } from './image-director.service';
import {
  ImageSettingKey,
  IMAGE_SECTIONS,
  IMAGE_SETTINGS,
  ImageDirectorPreset,
  ImageDirectorSettings,
  defaultSettings,
} from './models/image-director.model';

@Component({
  selector: 'app-image-director',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="id-page">
      <div class="id-header">
        <div>
          <h1 class="id-title"><i class="bi bi-image"></i> Image Director</h1>
          <p class="id-desc">Direct every detail of brand imagery — camera, lens, lighting, styling and more. Settings become reusable presets.</p>
        </div>
        <div class="id-actions">
          <button class="btn btn-outline-secondary id-btn" (click)="reset()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn id-btn-primary" (click)="saveCurrent()" [disabled]="!presetName().trim()">
            <i class="bi bi-bookmark-plus"></i> Save as Preset
          </button>
        </div>
      </div>

      @if (saving()) {
        <div class="id-save-bar">
          <input class="form-control id-save-input" placeholder="Preset name — e.g. Heritage Lookbook" [(ngModel)]="presetName" (keyup.enter)="saveCurrent()" />
          <button class="btn id-btn-primary" (click)="saveCurrent()" [disabled]="!presetName().trim()">
            <i class="bi bi-check-lg"></i> Save
          </button>
          <button class="btn btn-outline-secondary id-btn" (click)="saving.set(false)">
            <i class="bi bi-x-lg"></i> Cancel
          </button>
        </div>
      }

      <div class="id-layout">
        <div class="id-form">
          @for (section of sections(); track section) {
            <div class="id-section">
              <div class="id-section-head">
                <span class="id-section-step">{{ sectionIndex(section) }}</span>
                <h2 class="id-section-title">{{ section }}</h2>
                <span class="id-section-bar"></span>
              </div>
              <div class="id-grid">
                @for (def of settingsFor(section); track def.key) {
                  <div class="id-field" [class.id-field-wide]="def.type !== 'select'">
                    <label class="id-label"><i class="bi {{ def.icon }}"></i> {{ def.label }}</label>

                    @if (def.type === 'select') {
                      <select class="form-select id-select" [value]="settings()[def.key]" (change)="setSetting(def.key, $any($event.target).value)">
                        @for (opt of def.options; track opt) {
                          <option [value]="opt">{{ opt }}</option>
                        }
                      </select>
                    } @else if (def.type === 'textarea') {
                      <textarea class="form-control id-input id-textarea" [value]="settings()[def.key]" [placeholder]="def.placeholder" rows="3"
                        (input)="setSetting(def.key, $any($event.target).value)"></textarea>
                    } @else {
                      <input class="form-control id-input" [value]="settings()[def.key]" [placeholder]="def.placeholder"
                        (input)="setSetting(def.key, $any($event.target).value)" />
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <div class="id-side">
          <div class="id-panel">
            <div class="id-panel-head">
              <h3 class="id-panel-title"><i class="bi bi-collection"></i> Preset Library</h3>
              <span class="id-panel-badge">{{ presetCount() }}</span>
            </div>
            <div class="id-list">
              @for (p of presets(); track p.id) {
                <div class="id-preset" [class.id-preset-active]="p.id === activePresetId()">
                  <button class="id-fav" [class.id-fav-on]="p.favorite" (click)="toggleFavorite(p.id)" title="Favorite">
                    <i class="bi {{ p.favorite ? 'bi-star-fill' : 'bi-star' }}"></i>
                  </button>
                  <button class="id-preset-main" (click)="applyPreset(p)">
                    <span class="id-preset-name">{{ p.name }}</span>
                    <span class="id-preset-meta">{{ p.settings.imageStyle }} · {{ p.settings.colorPalette }}</span>
                  </button>
                  <div class="id-preset-actions">
                    <button class="id-icon-btn" (click)="duplicate(p.id)" title="Duplicate"><i class="bi bi-copy"></i></button>
                    <button class="id-icon-btn" (click)="deletePreset(p)" title="Delete"><i class="bi bi-trash3"></i></button>
                  </div>
                </div>
              }
              @if (presetCount() === 0) {
                <p class="id-empty">No presets yet. Configure below and save as a preset.</p>
              }
            </div>
          </div>

          <div class="id-panel">
            <div class="id-panel-head">
              <h3 class="id-panel-title"><i class="bi bi-file-earmark-text"></i> Image Direction</h3>
            </div>
            <pre class="id-preview">{{ preview() }}</pre>
            <button class="btn id-btn-primary id-copy" (click)="copyPreview()">
              <i class="bi bi-clipboard"></i> Copy Direction
            </button>
          </div>

          <div class="id-tiles">
            <div class="id-tile">
              <span class="id-tile-value">{{ settingsCount }}</span>
              <span class="id-tile-label">Settings</span>
            </div>
            <div class="id-tile">
              <span class="id-tile-value">{{ favoritesCount() }}</span>
              <span class="id-tile-label">Favorites</span>
            </div>
            <div class="id-tile">
              <span class="id-tile-value">{{ activePresetName() }}</span>
              <span class="id-tile-label">Active Preset</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './image-director.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageDirectorComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(ImageDirectorService);

  readonly settings = signal<ImageDirectorSettings>({ ...defaultSettings() });
  readonly presetName = signal('');
  readonly saving = signal(false);
  readonly activePresetId = signal<string | null>(null);

  readonly sections = computed(() => IMAGE_SECTIONS);
  readonly presets = computed(() => this.service.presets());
  readonly settingsCount = IMAGE_SETTINGS.length;

  readonly presetCount = computed(() => this.presets().length);
  readonly favoritesCount = computed(() => this.presets().filter(p => p.favorite).length);
  readonly activePresetName = computed(() => {
    const p = this.presets().find(x => x.id === this.activePresetId());
    return p ? p.name : 'Unsaved';
  });

  readonly preview = computed(() => this.buildPreview(this.settings()));

  sectionIndex(section: string): string {
    return String(IMAGE_SECTIONS.indexOf(section as typeof IMAGE_SECTIONS[number]) + 1).padStart(2, '0');
  }

  settingsFor(section: string) {
    return IMAGE_SETTINGS.filter(def => def.section === section);
  }

  setSetting(key: ImageSettingKey, value: string): void {
    this.settings.update(s => ({ ...s, [key]: value }));
    this.activePresetId.set(null);
  }

  applyPreset(p: ImageDirectorPreset): void {
    this.settings.set({ ...p.settings });
    this.activePresetId.set(p.id);
    this.saving.set(false);
    this.toast.success(`Applied preset “${p.name}”`);
  }

  saveCurrent(): void {
    const name = this.presetName().trim();
    if (!name) return;
    const saved = this.service.save({ name, favorite: false, settings: { ...this.settings() } });
    this.presetName.set('');
    this.saving.set(false);
    this.activePresetId.set(saved.id);
    this.toast.success(`Preset “${saved.name}” saved`);
  }

  duplicate(id: string): void {
    this.service.duplicate(id);
    this.toast.info('Preset duplicated');
  }

  deletePreset(p: ImageDirectorPreset): void {
    if (confirm(`Delete preset “${p.name}”?`)) {
      this.service.remove(p.id);
      if (this.activePresetId() === p.id) this.activePresetId.set(null);
      this.toast.info(`Preset “${p.name}” deleted`);
    }
  }

  toggleFavorite(id: string): void {
    this.service.toggleFavorite(id);
  }

  reset(): void {
    if (confirm('Reset Image Director to default settings?')) {
      this.settings.set(defaultSettings());
      this.activePresetId.set(null);
      this.saving.set(false);
      this.toast.info('Image Director reset to defaults');
    }
  }

  async copyPreview(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.preview());
      this.toast.success('Image direction copied to clipboard');
    } catch {
      this.toast.info('Could not access clipboard');
    }
  }

  private buildPreview(s: ImageDirectorSettings): string {
    const lines: string[] = [];
    lines.push(`${s.imageStyle} shot for the brand, ${s.colorPalette} color palette, ${s.aspectRatio} aspect ratio.`);
    lines.push('');
    lines.push(`Model: ${s.model}, ${s.pose} pose.`);
    if (s.props) lines.push(`Props: ${s.props}.`);
    if (s.accessories) lines.push(`Accessories: ${s.accessories}.`);
    lines.push(`Camera & Lens: ${s.camera} with ${s.lens}.`);
    lines.push(`Lighting: ${s.lighting}.`);
    lines.push(`Background: ${s.background}.`);
    lines.push(`Composition: ${s.composition}.`);
    lines.push('');
    lines.push(`Typography: ${s.typography}.`);
    if (s.brandElements) lines.push(`Brand Elements: ${s.brandElements}.`);
    lines.push(`Output Quality: ${s.outputQuality}.`);
    lines.push('');
    lines.push(`Negative prompt: ${s.negativePrompt || 'none'}`);
    return lines.join('\n');
  }
}