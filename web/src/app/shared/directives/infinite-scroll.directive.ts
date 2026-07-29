import { Directive, inject, signal, DestroyRef, effect, input, output } from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective {
  private readonly destroyRef = inject(DestroyRef);

  readonly disabled = input(false);

  readonly scrolled = output<void>();

  private readonly sentinel = signal<HTMLElement | null>(null);

  constructor() {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !this.disabled()) {
          this.scrolled.emit();
        }
      },
      { rootMargin: '400px' },
    );

    effect(() => {
      const el = this.sentinel();
      if (el) observer.observe(el);
      return () => observer.disconnect();
    });

    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  get sentinelEl() { return this.sentinel.asReadonly(); }
  setSentinel(el: HTMLElement | null) { this.sentinel.set(el); }
}
