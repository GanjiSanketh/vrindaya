import { Component, ElementRef, inject, input, signal, viewChild, afterNextRender } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroBanner } from '../../core/models/homepage.model';
import { HeroSequenceComponent } from '../../features/home/components/hero-sequence/hero-sequence.component';
import { HeroAnimationService } from '../../features/home/services/hero-animation.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [HeroSequenceComponent],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  readonly banner = input<HeroBanner | null>(null);
  readonly seq = viewChild(HeroSequenceComponent);
  readonly sectionRef = viewChild<ElementRef<HTMLElement>>('heroSection');
  readonly reducedMotion = signal(false);

  private readonly anim = inject(HeroAnimationService);
  private timeline: gsap.core.Timeline | null = null;

  constructor() {
    afterNextRender(() => {
      try {
        const sectionEl = this.sectionRef()?.nativeElement;
        if (!sectionEl) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.reducedMotion.set(reduced);

        const backdrop = sectionEl.querySelector<HTMLElement>('.hero-backdrop');
        if (!backdrop) return;

        backdrop.style.setProperty('opacity', '1');
        backdrop.style.setProperty('visibility', 'visible');

        if (reduced) return;

        this.startEntranceAnimation(backdrop, sectionEl);
      } catch {
        // ensure hero visible even if GSAP fails
      }
    });
  }

  private startEntranceAnimation(backdrop: HTMLElement, sectionEl: HTMLElement): void {
    const entrance = gsap.to(backdrop, {
      scale: 1,
      rotationY: 360,
      duration: 2.5,
      ease: 'power3.out',
      paused: true,
      onComplete: () => {
        this.setupScrollTrigger(sectionEl);
      },
      onError: () => {
        backdrop.style.removeProperty('scale');
        backdrop.style.removeProperty('rotationY');
      },
    });

    gsap.set(backdrop, { scale: 0.75, rotationY: 0, opacity: 1 });

    entrance.play();
  }

  private setupScrollTrigger(sectionEl: HTMLElement): void {
    try {
      gsap.registerPlugin(ScrollTrigger);

      const contentEls = sectionEl.querySelectorAll<HTMLElement>('.hero-cinematic-inner > *');
      gsap.set(contentEls, { opacity: 0, y: 20 });

      const totalPx = 300 * window.innerHeight / 100;

      this.timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: `+=${totalPx}px`,
          pin: sectionEl,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      this.timeline.to({}, { duration: 1 });

      this.anim.setFrameUpdateCallback((i: number) => {
        const seq = this.seq();
        if (seq) {
          seq.renderFrame(i);
        }
      });

      contentEls.forEach((el, i) => {
        this.timeline?.to(el, { opacity: 1, y: 0, ease: 'power3.out' }, 0.9 + i * 0.03);
      });
    } catch {
      // ScrollTrigger not required for hero visibility
    }
  }
}
