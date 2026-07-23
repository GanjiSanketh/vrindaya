import { Component, effect, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { PopupService }   from '../../core/services/popup.service';
import { PopupConfig }    from '../../core/models/popup.model';
import { Product }        from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector:    'app-popup',
  standalone:  true,
  templateUrl: './popup.component.html',
  styleUrl:    './popup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupComponent {
  private readonly svc            = inject(PopupService);
  private readonly platformId     = inject(PLATFORM_ID);
  private readonly productService = inject(ProductService);

  readonly cardVisible  = this.svc.floatingCard.asReadonly();
  readonly modalVisible = this.svc.fullPopup.asReadonly();
  product: Product | undefined;
  config:  PopupConfig | null = null;

  constructor() {
    effect(() => {
      if (this.svc.floatingCard()) {
        this.product = this.svc.getProduct();
        this.config  = this.svc.getConfig();
      }
    });
    effect(() => {
      if (this.svc.fullPopup()) {
        this.product = this.svc.getProduct();
        this.config  = this.svc.getConfig();
      }
    });
  }

  openModal():   void { this.svc.openFullPopup(); }
  dismissCard(): void { this.svc.dismissFloatingCard(); }
  closeModal():  void { this.svc.closeFullPopup(); }

  shopNow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.svc.closeFullPopup();
    if (this.product) this.productService.openProduct(this.product);
  }

  viewCollection(): void {
    this.svc.closeFullPopup();
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = '/new-arrivals';
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pu-backdrop')) {
      this.closeModal();
    }
  }
}
