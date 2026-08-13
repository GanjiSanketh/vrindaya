import {
  Component, signal, computed, input, effect, ElementRef, inject, PLATFORM_ID, afterNextRender, DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';
import {
  VrindayaStoryConfig,
  VrindayaStoryDefaultItem,
  DEFAULT_VRINDAYA_STORY_ITEMS,
} from '../../../../core/models/vrindaya-story.model';

interface StoryStep {
  id: number;
  index: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  position: string;
}

/** Built-in story content — used until the admin publishes a configuration (or as per-item fallback for copy the admin left blank). */
const DEFAULT_STEPS = DEFAULT_VRINDAYA_STORY_ITEMS.map(d => ({ ...d }));

/**
 * Merges the admin-managed configuration over the built-in defaults: any
 * active beat with an image becomes a step (order follows displayOrder);
 * copy the admin left blank falls back to the matching default.
 */
function defaultStep(d: VrindayaStoryDefaultItem, i: number): StoryStep {
  return {
    id: i,
    index: d.storyNumber,
    title: d.title,
    text: d.description,
    image: d.imageUrl,
    alt: d.imageAlt,
    position: d.imagePosition,
  };
}

function toSteps(config: VrindayaStoryConfig | null): StoryStep[] {
  if (!config || !config.items?.length) {
    return DEFAULT_STEPS.map(defaultStep);
  }

  const active = config.items
    .filter(item => item.isActive && item.imageUrl?.trim())
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (!active.length) {
    return DEFAULT_STEPS.map(defaultStep);
  }

  return active.map((item, i) => {
    const def = DEFAULT_STEPS.find(d => d.storyId === item.storyId) ?? DEFAULT_STEPS[i];
    return {
      id: i,
      index: item.storyNumber?.trim() || String(i + 1).padStart(2, '0'),
      title: item.title?.trim() || def?.title || `Story ${i + 1}`,
      text: item.description?.trim() || def?.description || '',
      image: item.imageUrl.trim(),
      alt: item.imageAlt?.trim() || def?.imageAlt || '',
      position: item.imagePosition || 'center',
    };
  });
}

@Component({
  selector: 'app-story-section',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './story-section.component.html',
  styleUrl: './story-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorySectionComponent {
  /** Admin-managed story configuration (homepageConfig/active.vrindayaStory). */
  readonly config = input<VrindayaStoryConfig | null>(null);

  /** Steps to render — config beats when published, built-in defaults otherwise. */
  readonly steps = computed(() => toSteps(this.config()));

  /** Story beat currently in the middle of the viewport. */
  readonly activeStep = signal(0);

  /** True while the closing beat is in view — releases the frame. */
  readonly exiting = signal(false);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private stepObserver: IntersectionObserver | null = null;

  constructor() {
    // Static pieces (the closing beat) only need one setup after first render.
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      // As the closing beat scrolls into view, the anchored frame eases
      // back — a natural release into the next section.
      const outroEl = this.el.nativeElement.querySelector('.story-outro') as HTMLElement | null;
      const outroObserver = new IntersectionObserver(
        ([entry]) => this.exiting.set(entry.isIntersecting),
        { rootMargin: '0px 0px -55% 0px', threshold: 0 },
      );

      if (outroEl) outroObserver.observe(outroEl);
      this.destroyRef.onDestroy(() => outroObserver.disconnect());
    });

    // The step list can change shape once the admin configuration hydrates
    // (defaults → published beats), so re-attach the beat observer whenever
    // the list changes — after the DOM for that change has been rendered.
    effect(() => {
      this.steps();
      if (!isPlatformBrowser(this.platformId)) return;
      afterNextRender(() => this.attachStepObserver());
    });
  }

  /** Observes the current .story-point elements; safe to call repeatedly. */
  private attachStepObserver(): void {
    this.stepObserver?.disconnect();
    this.stepObserver = null;

    const stepEls = Array.from(
      this.el.nativeElement.querySelectorAll('.story-point') as NodeListOf<HTMLElement>,
    );
    if (stepEls.length === 0) return;

    // The beat is considered "current" when it crosses the middle band of the
    // viewport — no scroll listeners, purely observer-driven.
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset['step']);
            if (Number.isFinite(idx)) this.activeStep.set(idx);
          }
        }
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
    );

    stepEls.forEach(el => observer.observe(el));
    this.stepObserver = observer;
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
