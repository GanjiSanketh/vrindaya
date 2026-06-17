import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() srDelay    = 0;  /* stagger delay in ms */
  @Input() srDistance = 28; /* slide-up distance in px */

  private el         = inject(ElementRef<HTMLElement>);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const node = this.el.nativeElement;
    node.style.opacity   = '0';
    node.style.transform = `translateY(${this.srDistance}px)`;
    node.style.transition = `opacity 0.65s ease ${this.srDelay}ms, transform 0.65s cubic-bezier(0.4, 0, 0.2, 1) ${this.srDelay}ms`;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.style.opacity   = '1';
          node.style.transform = 'translateY(0)';
          this.observer?.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
