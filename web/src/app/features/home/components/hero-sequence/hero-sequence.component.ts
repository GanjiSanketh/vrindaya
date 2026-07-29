import { Component, input, output, signal, isDevMode, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject, effect, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe } from '../../../../shared/pipes/cloudinary-url.pipe';

interface FloatingElement {
  id: number;
  type: 'diamond' | 'ring' | 'dot' | 'line';
  x: number;
  y: number;
  size: number;
  floatDuration: number;
  floatDelay: number;
  depth: number;
  opacity: number;
}

@Component({
  selector: 'app-hero-sequence',
  standalone: true,
  imports: [CloudinaryUrlPipe, CloudinarySrcsetPipe],
  template: `
    @if (showFallback()) {
      <div class="hero-fallback-bg" aria-hidden="true"></div>
    }

    <img
      [src]="currentSrc() | cloudinaryUrl:1920"
      [srcset]="currentSrc() | cloudinarySrcset"
      sizes="100vw"
      alt="Vrindaya — Wear The Grace"
      class="hero-image"
      [class.hero-image--loaded]="!loading()"
      [class.hero-image--hidden]="showFallback()"
      fetchpriority="high"
      loading="eager"
      decoding="async"
      width="1920" height="1080"
      (load)="onLoadSuccess()"
      (error)="onLoadError()"
    />

    @if (!loading()) {
      <div class="decorative-layers" aria-hidden="true">
        @for (el of elements(); track el.id) {
          <svg
            class="floating-el depth-{{ el.depth }}"
            [class.el-diamond]="el.type === 'diamond'"
            [class.el-ring]="el.type === 'ring'"
            [class.el-dot]="el.type === 'dot'"
            [class.el-line]="el.type === 'line'"
            [style.left.%]="el.x"
            [style.top.%]="el.y"
            [style.width.px]="el.size"
            [style.height.px]="el.size"
            [style.--float-duration.s]="el.floatDuration"
            [style.--float-delay.s]="el.floatDelay"
            [style.opacity]="el.opacity"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            @if (el.type === 'diamond') {
              <rect x="30" y="30" width="40" height="40" transform="rotate(45 50 50)"
                fill="none" stroke="var(--gold)" stroke-width="1.5" />
            } @else if (el.type === 'ring') {
              <circle cx="50" cy="50" r="25"
                fill="none" stroke="var(--gold)" stroke-width="1" opacity="0.6" />
            } @else if (el.type === 'dot') {
              <circle cx="50" cy="50" r="4"
                fill="var(--gold)" opacity="0.5" />
            } @else if (el.type === 'line') {
              <line x1="10" y1="50" x2="90" y2="50"
                stroke="var(--gold)" stroke-width="0.8" opacity="0.3" />
            }
          </svg>
        }
      </div>
    }
  `,
  styleUrl: './hero-sequence.component.css',
  host: {
    class: 'hero-sequence-container',
    '[class.loaded]': '!loading()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSequenceComponent implements OnInit {
  readonly fallbackImg = input<string>('');
  readonly loaded = output<void>();
  readonly mousePos = output<{ x: number; y: number }>();

  readonly currentSrc = signal<string>('');
  readonly loading = signal(true);
  readonly showFallback = signal(false);
  readonly elements = signal<FloatingElement[]>([]);

  private retried = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (!this.loading()) {
          this.initMouseTracking();
        }
      });
    }
  }

  ngOnInit(): void {
    const src = this.fallbackImg();
    if (src) {
      this.currentSrc.set(src);
    }
    this.generateElements();
  }

  private generateElements(): void {
    const els: FloatingElement[] = [
      { id: 0, type: 'diamond', x: 12, y: 20, size: 28, floatDuration: 8, floatDelay: 0, depth: 2, opacity: 0.5 },
      { id: 1, type: 'ring', x: 85, y: 15, size: 40, floatDuration: 10, floatDelay: 1, depth: 1, opacity: 0.3 },
      { id: 2, type: 'dot', x: 75, y: 60, size: 12, floatDuration: 7, floatDelay: 0.5, depth: 3, opacity: 0.4 },
      { id: 3, type: 'line', x: 5, y: 72, size: 60, floatDuration: 11, floatDelay: 2, depth: 1, opacity: 0.2 },
      { id: 4, type: 'diamond', x: 50, y: 25, size: 18, floatDuration: 9, floatDelay: 1.5, depth: 3, opacity: 0.35 },
      { id: 5, type: 'ring', x: 30, y: 75, size: 32, floatDuration: 12, floatDelay: 0.8, depth: 2, opacity: 0.25 },
      { id: 6, type: 'dot', x: 92, y: 40, size: 8, floatDuration: 6, floatDelay: 3, depth: 3, opacity: 0.3 },
      { id: 7, type: 'line', x: 60, y: 10, size: 44, floatDuration: 10, floatDelay: 2.5, depth: 2, opacity: 0.15 },
    ];
    this.elements.set(els);
  }

  private initMouseTracking(): void {
    const hostEl = this.el.nativeElement as HTMLElement;
    let ticking = false;

    hostEl.addEventListener('mousemove', (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = hostEl.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          this.mousePos.emit({ x, y });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  onLoadSuccess(): void {
    this.loading.set(false);
    this.showFallback.set(false);
    this.loaded.emit();
  }

  onLoadError(): void {
    const currentUrl = this.currentSrc();
    if (isDevMode()) console.error('[HeroSequence] Failed to load image:', currentUrl);

    if (!this.retried) {
      this.retried = true;
      const fallbackUrl = 'assets/hero/hero-fallback.png';
      this.currentSrc.set(fallbackUrl);
    } else {
      if (isDevMode()) console.error('[HeroSequence] Fallback image also failed. Showing neutral background.');
      this.loading.set(false);
      this.showFallback.set(true);
      this.loaded.emit();
    }
  }
}
