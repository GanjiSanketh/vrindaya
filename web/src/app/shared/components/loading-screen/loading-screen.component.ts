import {
  Component, OnInit, OnDestroy, signal, output, inject, PLATFORM_ID, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  readonly letters  = ['V','R','I','N','D','A','Y','A'];
  readonly visible  = signal(false);
  readonly hiding   = signal(false);
  readonly done     = output<void>();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.pid)) return;

    // Show only once per browser session
    if (sessionStorage.getItem(STORAGE_KEY)) {
      this.done.emit();
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(true);

    const startedAt = Date.now();

    // The hero (LCP) image is preloaded from <head>, so `window.load` firing
    // means the above-the-fold content is already painted behind the splash.
    // Reveal as soon as that happens (after the minimum brand-display time)
    // instead of always waiting the full fixed duration.
    const onPageLoaded = () => {
      if (Date.now() - startedAt >= MIN_DISPLAY_MS) {
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
