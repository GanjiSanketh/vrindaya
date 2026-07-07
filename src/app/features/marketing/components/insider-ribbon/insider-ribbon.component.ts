import { Component, HostListener, OnInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { InsiderExperienceService } from '../../services/insider-experience.service';

@Component({
  selector: 'app-insider-ribbon',
  standalone: true,
  templateUrl: './insider-ribbon.component.html',
  styleUrl: './insider-ribbon.component.css',
  animations: [
    trigger('slideUpDown', [
      state('hidden', style({ transform: 'translateY(100%)', opacity: 0, filter: 'blur(6px)' })),
      state('visible', style({ transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' })),
      transition('hidden <=> visible', [
        animate('{{ duration }}ms cubic-bezier(0.4, 0, 0.2, 1)'),
      ], { params: { duration: 300 } }),
    ]),
  ],
})
export class InsiderRibbonComponent implements OnInit {
  private readonly pid = inject(PLATFORM_ID);
  readonly svc = inject(InsiderExperienceService);

  private readonly reducedMotion = signal(false);
  private ticking = false;

  readonly animState = computed(() => ({
    value: this.svc.ribbonVisible() ? 'visible' : 'hidden',
    params: { duration: this.reducedMotion() ? 0 : 300 },
  }));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid)) return;
    this.reducedMotion.set(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.svc.initExitIntent();

    // The component mounts lazily (`@defer (on idle)`), so a user may already
    // be scrolled past the threshold by the time this runs — check the
    // current position immediately rather than waiting for a future scroll event.
    this.checkScrollDepth();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.pid) || this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.checkScrollDepth();
      this.ticking = false;
    });
  }

  private checkScrollDepth(): void {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const depth = scrollable <= 0 ? 1 : window.scrollY / scrollable;
    this.svc.reportScrollDepth(depth);
  }

  join(): void {
    this.svc.openModal('ribbon');
  }

  dismiss(): void {
    this.svc.dismissRibbon();
  }
}
