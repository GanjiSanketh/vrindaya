import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface ImageVariation {
  id: string;
  label: string;
  isFavorite: boolean;
  isSelected: boolean;
  thumbnailUrl: string;
  width: number;
  height: number;
}

@Component({
  selector: 'app-image-variations',
  standalone: true,
  imports: [],
  template: `
    <div class="iv-page">
      <div class="iv-header">
        <h1 class="iv-title">Image Variations</h1>
        <p class="iv-desc">Review, compare, and select your preferred image variations.</p>
      </div>

      <div class="iv-grid">
        @for (v of variations(); track v.id) {
          <div class="iv-card" [class.iv-selected]="v.isSelected">
            <div class="iv-thumbnail">
              <div class="iv-placeholder">
                <i class="bi bi-image"></i>
                <span>{{ v.label }}</span>
              </div>
            </div>
            <div class="iv-info">
              <span class="iv-dimensions">{{ v.width }} x {{ v.height }}</span>
            </div>
            <div class="iv-actions">
              <button class="iv-btn" [class.iv-btn-active]="v.isFavorite" (click)="onToggleFavorite(v)">
                <i class="bi bi-heart"></i> Favorite
              </button>
              <button class="iv-btn" [class.iv-btn-active]="v.isSelected" (click)="onToggleSelect(v)">
                <i class="bi bi-check-lg"></i> Select
              </button>
              <button class="iv-btn" (click)="onCompare(v)">
                <i class="bi bi-columns"></i> Compare
              </button>
              <button class="iv-btn" (click)="onDownload(v)">
                <i class="bi bi-download"></i> Download
              </button>
              <button class="iv-btn" (click)="onRegenerate(v)">
                <i class="bi bi-arrow-clockwise"></i> Regenerate
              </button>
              <button class="iv-btn" (click)="onUpscale(v)">
                <i class="bi bi-zoom-in"></i> Upscale
              </button>
            </div>
          </div>
        }
      </div>

      @if (selectedCount() > 0) {
        <div class="iv-bar">
          <span>{{ selectedCount() }} variation(s) selected</span>
          <button class="iv-btn iv-btn-primary" (click)="onDownloadSelected()">
            <i class="bi bi-download"></i> Download Selected
          </button>
          <button class="iv-btn iv-btn-secondary" (click)="onClearSelection()">
            <i class="bi bi-x-lg"></i> Clear
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './image-variations.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageVariationsComponent {
  variations = signal<ImageVariation[]>([
    { id: '1', label: 'Variation A', isFavorite: false, isSelected: false, thumbnailUrl: '', width: 1080, height: 1080 },
    { id: '2', label: 'Variation B', isFavorite: false, isSelected: false, thumbnailUrl: '', width: 1080, height: 1350 },
    { id: '3', label: 'Variation C', isFavorite: false, isSelected: false, thumbnailUrl: '', width: 1080, height: 1920 },
    { id: '4', label: 'Variation D', isFavorite: false, isSelected: false, thumbnailUrl: '', width: 1080, height: 1080 },
  ]);

  selectedCount() {
    return this.variations().filter(v => v.isSelected).length;
  }

  onToggleFavorite(variation: ImageVariation): void {
    this.variations.update(vs =>
      vs.map(v => (v.id === variation.id ? { ...v, isFavorite: !v.isFavorite } : v))
    );
  }

  onToggleSelect(variation: ImageVariation): void {
    this.variations.update(vs =>
      vs.map(v => (v.id === variation.id ? { ...v, isSelected: !v.isSelected } : v))
    );
  }

  onCompare(_variation: ImageVariation): void {}

  onDownload(_variation: ImageVariation): void {}

  onRegenerate(_variation: ImageVariation): void {}

  onUpscale(_variation: ImageVariation): void {}

  onDownloadSelected(): void {}

  onClearSelection(): void {
    this.variations.update(vs => vs.map(v => ({ ...v, isSelected: false })));
  }
}