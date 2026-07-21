import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_CONFIG, type HeroConfig } from './hero.config';

export interface AnimationPhase {
  label: string;
  start: number;
  end: number;
}

export const PHASES: AnimationPhase[] = [
  { label: 'zoom-in',     start: 0.00, end: 0.15 },
  { label: 'zoom-out',    start: 0.15, end: 0.35 },
  { label: 'sequence',    start: 0.35, end: 0.80 },
  { label: 'parallax',    start: 0.80, end: 0.90 },
  { label: 'reveal',      start: 0.90, end: 1.00 },
];

export interface AnimationState {
  progress: number;
  frameIndex: number;
  phase: string;
  scale: number;
  parallaxY: number;
  opacity: number;
}

@Injectable({ providedIn: 'root' })
export class HeroAnimationService {
  private tl: gsap.core.Timeline | null = null;
  private currentState: AnimationState = {
    progress: 0,
    frameIndex: 0,
    phase: 'zoom-in',
    scale: HERO_CONFIG.scale.start,
    parallaxY: 0,
    opacity: 0,
  };
  private onFrameUpdate: ((index: number) => void) | null = null;

  setFrameUpdateCallback(cb: (index: number) => void): void {
    this.onFrameUpdate = cb;
  }

  get config(): HeroConfig {
    return HERO_CONFIG;
  }

  get state(): AnimationState {
    return this.currentState;
  }

  private getResponsiveConfig(): { frames: number; scale: { start: number; end: number }; pinDuration: number } {
    const w = window.innerWidth;
    if (w < 768) {
      return {
        frames: HERO_CONFIG.mobile.frames,
        scale: HERO_CONFIG.mobile.scale,
        pinDuration: HERO_CONFIG.mobile.pinDuration,
      };
    }
    if (w < 1024) {
      return {
        frames: HERO_CONFIG.frames.count,
        scale: HERO_CONFIG.scale,
        pinDuration: HERO_CONFIG.tablet.pinDuration,
      };
    }
    return {
      frames: HERO_CONFIG.frames.count,
      scale: HERO_CONFIG.scale,
      pinDuration: HERO_CONFIG.pinDuration,
    };
  }

  animate(container: HTMLElement): gsap.core.Timeline {
    gsap.registerPlugin(ScrollTrigger);

    const cfg = this.getResponsiveConfig();
    const totalPx = cfg.pinDuration * window.innerHeight / 100;

    this.tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: `+=${totalPx}px`,
        pin: container,
        scrub: 1,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        if (!this.tl) return;
        this.updateState(this.tl.progress(), cfg.frames);
      },
    });

    this.tl.to({}, { duration: 1 });

    this.tl.eventCallback('onComplete', () => {
      this.onFrameUpdate?.(cfg.frames - 1);
    });

    return this.tl;
  }

  private updateState(progress: number, totalFrames: number): void {
    const phase = PHASES.find(p => progress >= p.start && progress < p.end) ?? PHASES[PHASES.length - 1];

    const norm = Math.min(Math.max(progress, 0), 1);
    const scale = HERO_CONFIG.scale.start + (HERO_CONFIG.scale.end - HERO_CONFIG.scale.start) * Math.min(norm / 0.35, 1);
    const parallaxY = norm > 0.8 ? (norm - 0.8) / 0.2 * (-20) : 0;
    const opacity = norm > 0.9 ? (norm - 0.9) / 0.1 : 0;

    const frameStart = 0.35;
    const frameEnd = 0.80;
    let frameIndex = 0;
    if (progress >= frameStart) {
      const f = (Math.min(progress, frameEnd) - frameStart) / (frameEnd - frameStart);
      frameIndex = Math.min(Math.round(f * (totalFrames - 1)), totalFrames - 1);
    }

    this.currentState = { progress, frameIndex, phase: phase.label, scale, parallaxY, opacity };

    if (progress >= frameStart && progress <= frameEnd) {
      this.onFrameUpdate?.(frameIndex);
    }
  }

  kill(): void {
    this.tl?.scrollTrigger?.kill();
    this.tl?.kill();
    this.tl = null;
  }
}
