import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd }  from '@angular/router';
import { filter }                               from 'rxjs/operators';
import { takeUntilDestroyed }                   from '@angular/core/rxjs-interop';

import { PopupComponent }          from './components/popup/popup.component';
import { PopupService }            from './core/services/popup.service';
import { AnalyticsService }        from './core/analytics/analytics.service';
import { LoadingScreenComponent }  from './shared/components/loading-screen/loading-screen.component';
import { ToastComponent }          from './shared/components/toast/toast.component';
import { RouteLoadingBarComponent } from './shared/components/route-loading-bar/route-loading-bar.component';
import { PwaInstallService }       from './shared/services/pwa-install.service';
import { UpdateService }           from './shared/services/update.service';
import { InstallPromptComponent }  from './shared/components/install-prompt/install-prompt.component';
import { UpdatePromptComponent }   from './shared/components/update-prompt/update-prompt.component';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet, PopupComponent, LoadingScreenComponent, ToastComponent, RouteLoadingBarComponent, InstallPromptComponent, UpdatePromptComponent],
  template: `
    <app-route-loading-bar />
    <app-loading-screen (done)="appReady.set(true)" />
    <router-outlet />
    <app-popup />
    <app-toast />
    <app-install-prompt />
    <app-update-prompt />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class App {
  private readonly popupService = inject(PopupService);
  private readonly router       = inject(Router);

  /** Inject to activate service worker listeners */
  private readonly pwaInstallSvc = inject(PwaInstallService);
  private readonly updateSvc     = inject(UpdateService);

  /** Inject to fetch + cache analytics settings once at startup. */
  private readonly analytics = inject(AnalyticsService);

  readonly appReady = signal(false);

  constructor() {
    // Fetch the analytics configuration a single time and cache it locally —
    // every tracking check reads this cached copy, never Firestore.
    void this.analytics.ensureLoaded();

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      if (e.urlAfterRedirects === '/') {
        this.popupService.loadAndSchedule();
      } else {
        this.popupService.deactivate();
      }
    });
  }
}
