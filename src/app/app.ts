import { Component, inject, OnDestroy }        from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter }                              from 'rxjs/operators';
import { Subscription }                        from 'rxjs';

import { PopupComponent } from './components/popup/popup.component';
import { PopupService }   from './core/services/popup.service';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet, PopupComponent],
  template:   `<router-outlet /><app-popup />`,
})
export class App implements OnDestroy {
  private readonly popupService = inject(PopupService);
  private readonly router       = inject(Router);
  private readonly routeSub:    Subscription;

  constructor() {
    // Load and arm the promotional popup only when on the home page.
    // Deactivate (clear timers, close UI) immediately on any other route.
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
