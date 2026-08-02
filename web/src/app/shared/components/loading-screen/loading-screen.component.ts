import {
  Component, OnInit, OnDestroy, signal, output, inject, effect, PLATFORM_ID, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LcpReadyService } from '../../../core/services/lcp-ready.service';
const STORAGE_KEY = 'vrindaya_visited';
/** The brand splash never flashes by — it always shows for at least this long. */
const MIN_DISPLAY_MS = 1200;
/** Hard cap — never longer than the previous fixed 2.6s splash. */
const MAX_DISPLAY_MS = 2600;

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  templateUrl: './loading-screen.component.html',
  styleUrl: './loading-screen.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreenComponent implements OnInit, OnDestroy {
  private readonly pid = inject(PLATFORM_ID);
  private readonly lcpReady = inject(LcpReadyService);
  private readonly startedAt = Date.now();
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  readonly letters  = ['V','R','I','N','D','A','Y','A'];
  readonly visible  = signal(false);
  readonly hiding   = signal(false);
  readonly done     = output<void>();

  constructor() {
    // The hero (LCP) image is preloaded from <head>, so the moment it paints
    // is the moment the above-the-fold content is ready to be revealed.
    // Reveal as soon as that happens (after the minimum brand-display time)
    // instead of always waiting for the full `window.load` (fonts, etc.).
    effect(() => {
      if (this.lcpReady.heroLoaded() && Date.now() - this.startedAt >= MIN_DISPLAY_MS) {
        this.dismiss();
      }
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid)) return;

    // Show only once per browser session
    if (sessionStorage.getItem(STORAGE_KEY)) {
      this.done.emit();
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(true);

    // Fallback — some runs never paint a hero image (offline/SSR fallback), so
    // `window.load` still releases the splash once the page is otherwise done.
    const onPageLoaded = () => {
      if (Date.now() - this.startedAt >= MIN_DISPLAY_MS) {
        this.dismiss();
      }
    };
    if (document.readyState === 'complete') {
      onPageLoaded();
    } else {
      window.addEventListener('load', onPageLoaded, { once: true });
      this.timeouts.push(setTimeout(() => window.removeEventListener('load', onPageLoaded), MAX_DISPLAY_MS + 1000));
    }

    // Hard cap — never blocks longer than the previous fixed splash.
    this.timeouts.push(setTimeout(() => this.dismiss(), MAX_DISPLAY_MS));
  }

  dismiss(): void {
    if (!this.visible() || this.hiding()) return;
    this.hiding.set(true);
    this.timeouts.push(setTimeout(() => {
      this.visible.set(false);
      this.done.emit();
    }, 550));
  }

  ngOnDestroy(): void {
    this.timeouts.forEach(t => clearTimeout(t));
  }
}
