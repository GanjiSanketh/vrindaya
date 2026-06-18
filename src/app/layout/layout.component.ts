import { Component, inject, afterNextRender }  from '@angular/core';
import { RouterOutlet }                         from '@angular/router';
import { HeaderComponent }                      from './header/header.component';
import { FooterComponent }                      from './footer/footer.component';
import { ProductQuickViewComponent }            from '../shared/components/product-quick-view/quick-view.component';
import { SearchOverlayComponent }               from '../features/search/search-overlay.component';
import { ImageLightboxComponent }               from '../shared/components/image-lightbox/image-lightbox.component';
import { FloatingInstagramComponent }           from '../shared/components/floating-instagram/floating-instagram.component';
import { ExitIntentPopupComponent }             from '../shared/components/exit-intent-popup/exit-intent-popup.component';
import { InstallPromptComponent }               from '../shared/components/install-prompt/install-prompt.component';
import { UpdateNotificationComponent }          from '../shared/components/update-notification/update-notification.component';
import { ExitIntentService }                    from '../core/services/exit-intent.service';

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
    FloatingInstagramComponent,
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
    <app-floating-instagram />
    <app-exit-intent-popup />
    <app-install-prompt />
    <app-update-notification />
  `,
})
export class LayoutComponent {
  private readonly exitIntent = inject(ExitIntentService);

  constructor() {
    afterNextRender(() => this.exitIntent.init());
  }
}
