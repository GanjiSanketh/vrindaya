import {
  Component, Input, inject, signal, computed,
  ChangeDetectionStrategy, PLATFORM_ID, ElementRef, DestroyRef, OnInit, AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroShowcase, HeroShowcaseItem } from '../../../../core/models/hero-showcase.model';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe } from '../../../../shared/pipes/cloudinary-url.pipe';

/** Mouse tilt limits — 6deg rotation, 20px movement (same spec as the premium hero). */
const MAX_ROTATION_DEG = 6;
const MAX_TRANSLATE_PX = 20;
const DEFAULT_BUTTON_TEXT = 'Shop Now';
const DEFAULT_BUTTON_LINK = '/shop';
const IMAGE_FALLBACK = 'assets/images/product-placeholder.svg';

/**
 * CMS-driven homepage hero. Renders the Hero Showcase configuration exactly
 * as saved from the admin screen — title, subtitle, button and image per
 * enabled item — with auto-rotation (interval read from Firestore, never
 * hardcoded), fade transition, pause-on-hover, floating card, parallax mouse
 * movement and image hover zoom. Animations are CSS transforms/opacity only
 * (no Three.js/GSAP/Lottie) and respect prefers-reduced-motion.
 */
@Component({
  selector: 'app-hero-showcase',
  standalone: true,
  imports: [RouterLink, CloudinaryUrlPipe, CloudinarySrcsetPipe],
  templateUrl: './hero-showcase.component.html',
  styleUrl: './hero-showcase.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroShowcaseComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) config!: HeroShowcase;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Index of the active slide. */
  readonly index = signal(0);
  /** True while the pointer rests over the showcase (pauses auto-rotation). */
  readonly paused = signal(false);

  /** Renderable slides — enabled, with an image, ordered by displayOrder. */
  readonly items = computed<HeroShowcaseItem[]>(() => {
    if (!this.config) return [];
    return this.config.items
      .filter(item => item.enabled && item.imageUrl?.trim())
      .sort((a, b) => a.displayOrder - b.displayOrder);
  });

  /** The active slide. */
  readonly current = computed<HeroShowcaseItem | null>(() => {
    const list = this.items();
    if (!list.length) return null;
    return list[this.index() % list.length] ?? null;
  });

  /** Single-item list keyed by itemId — Angular rebuilds the slide when the key changes, replaying the fade. */
  readonly displayList = computed<HeroShowcaseItem[]>(() => {
    const item = this.current();
    return item ? [item] : [];
  });

  readonly rotates = computed(() => this.items().length > 1);
  readonly autoplay = computed(() => this.config?.autoplay === true && this.rotates());

  readonly buttonText = computed(() => this.current()?.buttonText?.trim() || DEFAULT_BUTTON_TEXT);
  readonly buttonLink = computed(() => this.current()?.buttonLink?.trim() || DEFAULT_BUTTON_LINK);
  readonly isExternalLink = computed(() => /^https?:\/\//i.test(this.buttonLink()));
  readonly image = computed(() => this.current()?.imageUrl?.trim() || IMAGE_FALLBACK);

  readonly transition = computed(() => (this.config?.transition === 'slide' || this.config?.transition === 'scaleFade'
    ? this.config.transition
    : 'fade'));

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && this.autoplay()) {
      const intervalMs = (this.config?.rotationIntervalSeconds ?? 8) * 1000;
      interval(intervalMs)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.advance());
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initShowcaseMotion();
    }
  }

  /** Jumps to a specific slide (indicator dots). */
  select(index: number): void {
    const len = this.items().length;
    if (!len) return;
    this.index.set(((index % len) + len) % len);
  }

  private advance(): void {
    if (!this.rotates()) return;
    if (this.config?.pauseOnHover === true && this.paused()) return;
    this.index.update(i => (i + 1) % this.items().length);
  }

  /** Mouse parallax (tilt + translate) + pause-on-hover. Transform-only, rAF-throttled, reduced-motion aware. */
  private initShowcaseMotion(): void {
    const section = this.el.nativeElement.querySelector('.hsc-hero') as HTMLElement | null;
    const tilt = this.el.nativeElement.querySelector('.hsc-tilt') as HTMLElement | null;
    const stage = this.el.nativeElement.querySelector('.hsc-stage') as HTMLElement | null;
    if (!section || !tilt) return;

    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ticking = false;
    const onMouseMove = (e: MouseEvent) => {
      if (reduceMotion || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        tilt.style.transform =
          `rotateY(${(x * MAX_ROTATION_DEG).toFixed(2)}deg) ` +
          `rotateX(${(y * MAX_ROTATION_DEG).toFixed(2)}deg) ` +
          `translate3d(${(x * MAX_TRANSLATE_PX).toFixed(2)}px, ${(y * MAX_TRANSLATE_PX).toFixed(2)}px, 0)`;
        ticking = false;
      });
    };

    const onMouseLeave = () => {
      if (reduceMotion) return;
      tilt.style.transform = 'rotateY(0deg) rotateX(0deg) translate3d(0, 0, 0)';
    };

    const onStageEnter = () => this.paused.set(true);
    const onStageLeave = () => this.paused.set(false);

    section.addEventListener('mousemove', onMouseMove, { passive: true });
    section.addEventListener('mouseleave', onMouseLeave, { passive: true });
    stage?.addEventListener('mouseenter', onStageEnter, { passive: true });
    stage?.addEventListener('mouseleave', onStageLeave, { passive: true });

    this.destroyRef.onDestroy(() => {
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
      stage?.removeEventListener('mouseenter', onStageEnter);
      stage?.removeEventListener('mouseleave', onStageLeave);
    });
  }
}
