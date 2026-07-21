import { Component, ElementRef, inject, input, viewChild, afterNextRender, type OnDestroy } from '@angular/core';
import { HeroPreloadService } from '../../services/hero-preload.service';

@Component({
  selector: 'app-hero-sequence',
  standalone: true,
  template: `
    <canvas class="hero-canvas" #sequenceCanvas></canvas>
    @if (!progress().done) {
      <div class="loading-overlay">
        <div class="loading-bar-track">
          <div class="loading-bar-fill" [style.width.%]="progress().percent"></div>
        </div>
        <span class="loading-text">Loading&hellip;</span>
      </div>
    }
  `,
  styleUrl: './hero-sequence.component.css',
  host: { class: 'hero-sequence-container' },
})
export class HeroSequenceComponent implements OnDestroy {
  private readonly preload = inject(HeroPreloadService);
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('sequenceCanvas');
  readonly fallbackImg = input<string>('');
  readonly progress = this.preload.progress;

  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private loadedImages: HTMLImageElement[] = [];
  private currentFrame = 0;
  private canvasEl: HTMLCanvasElement | null = null;
  private rafActive = false;
  private targetFrame = 0;

  constructor() {
    afterNextRender(() => this.tryInit());
  }

  preloadFrames(): Promise<void> {
    return this.tryInit();
  }

  private async tryInit(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.canvasEl = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resizeCanvas();

    const isMobile = window.innerWidth < 768;
    this.loadedImages = await this.preload.preload(isMobile);

    if (this.loadedImages.length > 0) {
      this.drawFrame(0);
    }

    window.addEventListener('resize', this.onResize);
  }

  private initialized = false;

  private onResize = (): void => {
    this.resizeCanvas();
    if (this.loadedImages.length > 0) {
      this.drawFrame(this.currentFrame);
    }
  };

  private resizeCanvas(): void {
    if (!this.canvasEl) return;
    const rect = this.canvasEl.parentElement?.getBoundingClientRect() ?? { width: 0, height: 0 };
    const dpr = window.devicePixelRatio || 1;
    this.canvasEl.width = rect.width * dpr;
    this.canvasEl.height = rect.height * dpr;
    this.canvasEl.style.width = `${rect.width}px`;
    this.canvasEl.style.height = `${rect.height}px`;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  renderFrame(index: number): void {
    if (this.rafActive) {
      this.targetFrame = index;
      return;
    }
    this.rafActive = true;
    this.targetFrame = index;
    this.animationId = requestAnimationFrame(() => {
      this.drawFrame(this.targetFrame);
      this.rafActive = false;
    });
  }

  private drawFrame(index: number): void {
    if (!this.ctx || !this.canvasEl) return;
    const img = this.loadedImages[index];
    if (!img || !img.complete) return;

    this.currentFrame = index;
    const w = this.canvasEl.clientWidth;
    const h = this.canvasEl.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ctx.clearRect(0, 0, w, h);

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    this.ctx.drawImage(img, sx, sy, sw, sh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.preload.clear();
  }
}
