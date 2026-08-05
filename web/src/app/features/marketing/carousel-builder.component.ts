import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface CarouselSlide {
  id: string;
  headline: string;
  caption: string;
  cta: string;
}

@Component({
  selector: 'app-carousel-builder',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="cb-page">
      <div class="cb-header">
        <h1 class="cb-title">Carousel Builder</h1>
        <p class="cb-desc">Create Instagram carousel posts slide by slide.</p>
      </div>

      <div class="cb-actions">
        <button class="cb-btn cb-btn-primary" (click)="onAddSlide()">
          <i class="bi bi-plus-lg"></i> Add Slide
        </button>
      </div>

      <div class="cb-slides">
        @for (slide of slides(); track slide.id) {
          <div class="cb-slide-card">
            <div class="cb-slide-number">{{ slideIndex(slide.id) + 1 }}</div>
            <div class="cb-slide-body">
              <div class="cb-field">
                <label class="cb-label">Headline</label>
                <input type="text" class="cb-input" [(ngModel)]="slide.headline" name="headline{{ slide.id }}" placeholder="Slide headline" />
              </div>
              <div class="cb-field">
                <label class="cb-label">Image</label>
                <div class="cb-image-placeholder">
                  <i class="bi bi-image"></i>
                  <span>Slide {{ slideIndex(slide.id) + 1 }}</span>
                </div>
              </div>
              <div class="cb-field">
                <label class="cb-label">Caption</label>
                <textarea class="cb-textarea" [(ngModel)]="slide.caption" name="caption{{ slide.id }}" rows="2" placeholder="Slide caption"></textarea>
              </div>
              <div class="cb-field">
                <label class="cb-label">CTA</label>
                <input type="text" class="cb-input" [(ngModel)]="slide.cta" name="cta{{ slide.id }}" placeholder="Call to action" />
              </div>
            </div>
            <div class="cb-slide-actions">
              <button class="cb-icon-btn" (click)="onMoveUp(slide.id)" [disabled]="isFirst(slide.id)" title="Move up">
                <i class="bi bi-arrow-up"></i>
              </button>
              <button class="cb-icon-btn" (click)="onMoveDown(slide.id)" [disabled]="isLast(slide.id)" title="Move down">
                <i class="bi bi-arrow-down"></i>
              </button>
              <button class="cb-icon-btn cb-icon-danger" (click)="onRemove(slide.id)" title="Remove">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        }
      </div>

      @if (slides().length > 0) {
        <div class="cb-summary">
          <span>{{ slides().length }} slide(s)</span>
          <button class="cb-btn cb-btn-secondary" (click)="onClearAll()">
            <i class="bi bi-x-lg"></i> Clear All
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './carousel-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselBuilderComponent {
  slides = signal<CarouselSlide[]>([
    { id: '1', headline: 'Discover the Collection', caption: 'Explore our latest designs crafted for elegance.', cta: 'Shop Now' },
    { id: '2', headline: 'Timeless Style', caption: 'Classic pieces that never go out of fashion.', cta: 'Learn More' },
    { id: '3', headline: 'Made for You', caption: 'Premium quality, tailored to your taste.', cta: 'View Details' },
  ]);

  slideIndex(id: string): number {
    return this.slides().findIndex(s => s.id === id);
  }

  isFirst(id: string): boolean {
    return this.slideIndex(id) === 0;
  }

  isLast(id: string): boolean {
    return this.slideIndex(id) === this.slides().length - 1;
  }

  onAddSlide(): void {
    const newSlide: CarouselSlide = {
      id: Date.now().toString(),
      headline: '',
      caption: '',
      cta: '',
    };
    this.slides.update(slides => [...slides, newSlide]);
  }

  onRemove(id: string): void {
    this.slides.update(slides => slides.filter(s => s.id !== id));
  }

  onMoveUp(id: string): void {
    const idx = this.slideIndex(id);
    if (idx <= 0) return;
    this.slides.update(slides => {
      const updated = [...slides];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      return updated;
    });
  }

  onMoveDown(id: string): void {
    const idx = this.slideIndex(id);
    if (idx >= this.slides().length - 1) return;
    this.slides.update(slides => {
      const updated = [...slides];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      return updated;
    });
  }

  onClearAll(): void {
    this.slides.set([]);
  }
}