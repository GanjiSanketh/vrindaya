import {
  Component, signal, ElementRef, inject, PLATFORM_ID, afterNextRender, DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

interface StoryStep {
  id: number;
  index: string;
  title: string;
  text: string;
  image: string;
  alt: string;
}

const STEPS: StoryStep[] = [
  {
    id: 0,
    index: '01',
    title: 'Rooted in heritage',
    text:
      'Every Vrindaya silhouette begins with the craft traditions of Indian textile houses — block prints, hand looms and drape — studied, then quietly reimagined for the way you live today.',
    image: 'assets/hero/hero-banner-2.png',
    alt: 'Vrindaya heritage craft',
  },
  {
    id: 1,
    index: '02',
    title: 'Fabrics that breathe',
    text:
      'Cotton and georgette are chosen by hand, garment by garment, for their weight, drape and colour depth. Soft to the touch, composed on the body, season after season.',
    image: 'assets/hero/hero-banner-3.png',
    alt: 'Vrindaya fabrics in motion',
  },
  {
    id: 2,
    index: '03',
    title: 'Designed to be lived in',
    text:
      'From quiet mornings to grand evenings, the collection moves with you — considered silhouettes that feel as graceful at a desk as they do at a celebration.',
    image: 'assets/hero/hero-banner-4.png',
    alt: 'Vrindaya modern ethnic wear',
  },
];

@Component({
  selector: 'app-story-section',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './story-section.component.html',
  styleUrl: './story-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorySectionComponent {
  readonly steps = STEPS;

  readonly activeStep = signal(0);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const stepEls = Array.from(
        this.el.nativeElement.querySelectorAll('.story-step') as NodeListOf<HTMLElement>,
      );

      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              const idx = Number(el.dataset['step']);
              if (Number.isFinite(idx)) this.activeStep.set(idx);
            }
          }
        },
        // The step is considered "current" when it crosses the middle band
        // of the viewport — no scroll listeners, purely observer-driven.
        { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
      );

      stepEls.forEach(el => observer.observe(el));
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
