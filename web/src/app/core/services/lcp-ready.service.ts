import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the above-the-fold hero image (the LCP element) has finished
 * loading in the browser. The first-visit splash uses this to reveal the page
 * as soon as the hero is painted, instead of waiting for `window.load` — which
 * on slow mobile connections also waits for web fonts and other resources.
 */
@Injectable({ providedIn: 'root' })
export class LcpReadyService {
  readonly heroLoaded = signal(false);

  markHeroLoaded(): void {
    this.heroLoaded.set(true);
  }
}
