import { Component, inject, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd }            from '@angular/router';
import { filter }                                         from 'rxjs/operators';
import { takeUntilDestroyed }                             from '@angular/core/rxjs-interop';
import { HeaderComponent }                               from './header/header.component';
import { FooterComponent }                               from './footer/footer.component';
import { ProductQuickViewComponent }                     from '../shared/components/product-quick-view/quick-view.component';
import { SearchOverlayComponent }                        from '../features/search/search-overlay.component';
import { ImageLightboxComponent }                        from '../shared/components/image-lightbox/image-lightbox.component';
import { ExitIntentPopupComponent }                      from '../shared/components/exit-intent-popup/exit-intent-popup.component';
import { InstallPromptComponent }                        from '../shared/components/install-prompt/install-prompt.component';
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
  ],
  template: `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <app-header />
    <router-outlet />
    <app-footer />
    <app-product-quick-view />
    <app-search-overlay />
    <app-image-lightbox />
    <app-exit-intent-popup />
    <app-install-prompt />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  private readonly exitIntent  = inject(ExitIntentService);
  private readonly router      = inject(Router);

  constructor() {
    afterNextRender(() => this.exitIntent.init());

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      this.exitIntent.setOnHome(e.urlAfterRedirects === '/');
    });
  }
}
