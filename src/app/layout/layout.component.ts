import { Component, inject, afterNextRender, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd }            from '@angular/router';
import { filter }                                         from 'rxjs/operators';
import { Subscription }                                   from 'rxjs';
import { HeaderComponent }                               from './header/header.component';
import { FooterComponent }                               from './footer/footer.component';
import { ProductQuickViewComponent }                     from '../shared/components/product-quick-view/quick-view.component';
import { SearchOverlayComponent }                        from '../features/search/search-overlay.component';
import { ImageLightboxComponent }                        from '../shared/components/image-lightbox/image-lightbox.component';
import { ExitIntentPopupComponent }                      from '../shared/components/exit-intent-popup/exit-intent-popup.component';
import { InstallPromptComponent }                        from '../shared/components/install-prompt/install-prompt.component';
import { UpdateNotificationComponent }                   from '../shared/components/update-notification/update-notification.component';
import { ExitIntentService }                             from '../core/services/exit-intent.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    ProductQuickViewComponent,
    SearchOverlayComponent,
    ImageLightboxComponent,
    ExitIntentPopupComponent,
    InstallPromptComponent,
    UpdateNotificationComponent,
  ],
  template: `
    <app-header />
    <router-outlet />
    <app-footer />
    <app-product-quick-view />
    <app-search-overlay />
    <app-image-lightbox />
    <app-exit-intent-popup />
    <app-install-prompt />
    <app-update-notification />
  `,
})
export class LayoutComponent implements OnDestroy {
  private readonly exitIntent  = inject(ExitIntentService);
  private readonly router      = inject(Router);
  private readonly routeSub:   Subscription;

  constructor() {
    // Attach DOM listeners once, after first browser render
    afterNextRender(() => this.exitIntent.init());

    // Gate exit-intent on the home route only
    this.routeSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe(e => {
      this.exitIntent.setOnHome(e.urlAfterRedirects === '/');
    });
  }

  ngOnDestroy(): void { this.routeSub.unsubscribe(); }
}
