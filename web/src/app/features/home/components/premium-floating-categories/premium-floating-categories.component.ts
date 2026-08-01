import {
  Component, inject, input, signal, computed,
  ChangeDetectionStrategy, PLATFORM_ID, ElementRef, DestroyRef, AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Category } from '../../../../core/models/product.model';

/** A single floating category tile rendered by the hero. */
export interface FloatingCategoryItem {
  id: string;
  name: string;
  subtitle: string;
  image: string;
}

/**
 * Preferred showcase order + fallback subtitles. The live Category records are
 * always reused — these only fill in a subtitle when a category has none.
 */
const CATEGORY_ORDER: { id: string; subtitle: string }[] = [
  { id: 'long-kurtas',  subtitle: 'Elegant Everyday Styles' },
  { id: 'short-kurtas', subtitle: 'Comfort Meets Style' },
  { id: '2-piece-sets', subtitle: 'Effortlessly Coordinated' },
  { id: '3-piece-sets', subtitle: 'Complete Ethnic Elegance' },
];

const IMAGE_FALLBACK = 'assets/images/product-placeholder.svg';

/** Per-card parallax depth (x/y in px at the edges). Never exceeds 12px. */
const PARALLAX_DEPTHS: { x: number; y: number }[] = [
  { x: 8,  y: 5 },
  { x: 12, y: 7 },
  { x: 6,  y: 4 },
  { x: 10, y: 6 },
];

/** Per-card continuous float timings (seconds) — varied so cards drift out of sync. */
const FLOAT_DURATIONS = [6, 7, 5.5, 6.5];
const FLOAT_DELAYS = [0, 0.8, 1.6, 2.4];

@Component({
  selector: 'app-premium-floating-categories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './premium-floating-categories.component.html',
  styleUrl: './premium-floating-categories.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumFloatingCategoriesComponent implements AfterViewInit {
  /** Existing Category records supplied by the caller (ProductService.categories). */
  readonly categories = input<Category[]>([]);
  /** Category loading flag — shows skeleton tiles while true. */
  readonly loading = input(false);

  /** Ordered tiles derived from the live category data — no category logic duplicated. */
  readonly items = computed<FloatingCategoryItem[]>(() => this.buildItems(this.categories()));

  readonly floatDurations = FLOAT_DURATIONS;
  readonly floatDelays = FLOAT_DELAYS;

  private readonly parallaxTransforms = signal<string[]>([]);
  private readonly reducedMotion = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const apply = () => this.reducedMotion.set(media.matches);
      apply();
      media.addEventListener('change', apply);
      this.destroyRef.onDestroy(() => media.removeEventListener('change', apply));
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initParallax();
    }
  }

  /** Inline parallax transform for a tile — animated via CSS transition. */
  parallaxTransform(index: number): string {
    return this.parallaxTransforms()[index] ?? 'translate3d(0, 0, 0)';
  }

  private buildItems(cats: Category[]): FloatingCategoryItem[] {
    if (!cats?.length) return [];

    const byId = new Map(cats.map(c => [c.id, c] as const));
    const matched = CATEGORY_ORDER
      .map(spec => byId.get(spec.id))
      .filter((c): c is Category => Boolean(c))
      .map(c => ({
        id: c.id,
        name: c.name,
        subtitle: c.subtitle?.trim() || CATEGORY_ORDER.find(s => s.id === c.id)?.subtitle || '',
        image: c.image || IMAGE_FALLBACK,
      }));

    if (matched.length) return matched.slice(0, 4);

    return cats.slice(0, 4).map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle?.trim() || '',
      image: c.image || IMAGE_FALLBACK,
    }));
  }

  private initParallax(): void {
    const section = this.el.nativeElement.querySelector('.pfc-hero') as HTMLElement | null;
    if (!section) return;

    let ticking = false;
    const onMouseMove = (e: MouseEvent) => {
      if (this.reducedMotion()) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        const transforms = this.items().map((_, i) => {
          const depth = PARALLAX_DEPTHS[i % PARALLAX_DEPTHS.length];
          const dx = Math.max(-12, Math.min(12, x * depth.x));
          const dy = Math.max(-12, Math.min(12, y * depth.y));
          return `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        });
        this.parallaxTransforms.set(transforms);
        ticking = false;
      });
    };

    const onMouseLeave = () => {
      if (this.reducedMotion()) return;
      this.parallaxTransforms.set(this.items().map(() => 'translate3d(0, 0, 0)'));
    };

    section.addEventListener('mousemove', onMouseMove, { passive: true });
    section.addEventListener('mouseleave', onMouseLeave, { passive: true });

    this.destroyRef.onDestroy(() => {
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
    });
  }
}
