import {
  Component, signal, computed, input, effect, ElementRef, inject, PLATFORM_ID, afterNextRender,
  ChangeDetectionStrategy, AfterViewInit, OnDestroy,
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
export class StorySectionComponent implements AfterViewInit, OnDestroy {
  /** Admin-managed story configuration (homepageConfig/active.vrindayaStory). */
  readonly config = input<VrindayaStoryConfig | null>(null);

  /** Steps to render — config beats when published, built-in defaults otherwise. */
  readonly steps = computed(() => toSteps(this.config()));

  /** Story beat whose runway trigger is currently in the middle of the viewport. */
  readonly activeStep = signal(0);

  /** True once the closing beat takes over — the stage eases back, releasing into the outro. */
  readonly exiting = computed(
    () => this.steps().length > 1 && this.activeStep() === this.steps().length - 1,
  );

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  private stepObserver: IntersectionObserver | null = null;
  private destroyed = false;

  constructor() {
    // The step list can change shape once the admin configuration hydrates
    // (defaults → published beats), so re-attach the trigger observer whenever
    // the list changes — after the DOM for that change has been rendered.
    // Data loading (VrindayaStoryService) is fully independent of this
    // machinery: the observer only ever runs against already-rendered steps.
    effect(() => {
      this.steps();
      if (!isPlatformBrowser(this.platformId)) return;
      afterNextRender(() => this.attachStepObserver());
    });
  }

  /**
   * Deterministic first attach — runs once the view exists, independent of
   * effect scheduling, so the observer can never be skipped when the initial
   * (default) steps have rendered.
   */
  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.attachStepObserver();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stepObserver?.disconnect();
    this.stepObserver = null;
  }

  /**
   * Observes the runway triggers (.story-trigger — one 100vh block per beat).
   * The beat whose trigger crosses the middle band of the viewport becomes
   * the active story. Purely observer-driven, no scroll listeners. Safe to
   * call repeatedly: each call replaces the previous observer.
   */
  private attachStepObserver(): void {
    if (this.destroyed) return;
    this.stepObserver?.disconnect();
    this.stepObserver = null;

    const triggers = Array.from(
      this.el.nativeElement.querySelectorAll('.story-trigger') as NodeListOf<HTMLElement>,
    );
    if (triggers.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        if (this.destroyed) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset['step']);
            if (Number.isFinite(idx)) this.activeStep.set(idx);
          }
        }
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
    );

    triggers.forEach(trigger => observer.observe(trigger));
    this.stepObserver = observer;
  }
}
