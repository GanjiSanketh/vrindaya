import { Injectable, signal, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the install prompt is available and shown */
  readonly showPrompt = signal(false);

  /** Whether the app has been installed */
  readonly installed = signal(false);

  /** True if the user dismissed the prompt this session */
  private dismissed = false;

  private deferredPrompt: any = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    merge(
      fromEvent<Event>(window, 'beforeinstallprompt').pipe(
        map(e => { e.preventDefault(); return e; }),
      ),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(e => {
      this.deferredPrompt = e;
      if (!this.dismissed && !this.installed()) {
        this.showPrompt.set(true);
      }
    });

    fromEvent<Event>(window, 'appinstalled').pipe(
      takeUntilDestroyed(this.destroyRef),
      filter(() => isPlatformBrowser(this.platformId)),
    ).subscribe(() => {
      this.installed.set(true);
      this.showPrompt.set(false);
      this.deferredPrompt = null;
    });
  }

  install(): void {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((result: { outcome: string }) => {
      if (result.outcome === 'accepted') {
        this.installed.set(true);
      }
      this.showPrompt.set(false);
      this.deferredPrompt = null;
    });
  }

  dismiss(): void {
    this.dismissed = true;
    this.showPrompt.set(false);
    this.deferredPrompt = null;
  }
}
