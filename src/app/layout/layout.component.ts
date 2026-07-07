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
import { InsiderRibbonComponent }                        from '../features/marketing/components/insider-ribbon/insider-ribbon.component';
import { InsiderModalComponent }                         from '../features/marketing/components/insider-modal/insider-modal.component';
import { InsiderExperienceService }                      from '../features/marketing/services/insider-experience.service';
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
    InsiderRibbonComponent,
    InsiderModalComponent,
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

    @defer (on idle) {
      <app-insider-ribbon />
    }

    @defer (when insider.modalOpen()) {
      <app-insider-modal />
    }
  `,
})
export class LayoutComponent implements OnDestroy {
  private readonly exitIntent  = inject(ExitIntentService);
  readonly insider              = inject(InsiderExperienceService);
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
