import {
  Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Scroll-reveal directive — applies once when element enters the viewport.
 *
 * Usage:
 *   <div appScrollReveal>…</div>
 *   <div appScrollReveal [srDelay]="150" [srDistance]="40">…</div>
 *   <div appScrollReveal srVariant="fade">…</div>   (fade-only, no slide)
 */
@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() srDelay    = 0;      // stagger delay in ms
  @Input() srDistance = 40;     // slide-up distance in px
  @Input() srDuration = 700;    // animation duration in ms
  @Input() srVariant: 'slide' | 'fade' | 'scale' = 'slide';

  private el         = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const node = this.el.nativeElement as HTMLElement;

    node.style.willChange = 'opacity, transform';
    node.style.opacity    = '0';

    if (this.srVariant === 'slide') {
      node.style.transform  = `translateY(${this.srDistance}px)`;
      node.style.transition =
        `opacity ${this.srDuration}ms cubic-bezier(0.4,0,0.2,1) ${this.srDelay}ms,` +
        `transform ${this.srDuration}ms cubic-bezier(0.4,0,0.2,1) ${this.srDelay}ms`;
    } else if (this.srVariant === 'scale') {
      node.style.transform  = `scale(0.96) translateY(${this.srDistance * 0.5}px)`;
      node.style.transition =
        `opacity ${this.srDuration}ms cubic-bezier(0.4,0,0.2,1) ${this.srDelay}ms,` +
        `transform ${this.srDuration}ms cubic-bezier(0.4,0,0.2,1) ${this.srDelay}ms`;
    } else {
      node.style.transition = `opacity ${this.srDuration}ms ease ${this.srDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.style.opacity   = '1';
          node.style.transform = 'none';
          node.style.willChange = 'auto';
          this.observer?.unobserve(node);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
