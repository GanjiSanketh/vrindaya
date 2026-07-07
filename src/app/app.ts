import { Component, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd }  from '@angular/router';
import { filter }                               from 'rxjs/operators';
import { Subscription }                         from 'rxjs';

import { PopupComponent }          from './components/popup/popup.component';
import { PopupService }            from './core/services/popup.service';
import { LoadingScreenComponent }  from './shared/components/loading-screen/loading-screen.component';
import { ToastComponent }          from './shared/components/toast/toast.component';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet, PopupComponent, LoadingScreenComponent, ToastComponent],
  template: `
    <app-loading-screen (done)="appReady.set(true)" />
    @if (appReady()) {
      <router-outlet />
      <app-popup />
      <app-toast />
    }
  `,
})
export class App implements OnDestroy {
  private readonly popupService = inject(PopupService);
  private readonly router       = inject(Router);
  private readonly routeSub:    Subscription;

  readonly appReady = signal(false);

  constructor() {
    this.routeSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe(e => {
      if (e.urlAfterRedirects === '/') {
        this.popupService.loadAndSchedule();
      } else {
        this.popupService.deactivate();
      }
    });
  }

  ngOnDestroy(): void { this.routeSub.unsubscribe(); }
}
