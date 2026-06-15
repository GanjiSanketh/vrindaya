import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe }                   from '@angular/common';
import { Subscription }                                      from 'rxjs';

import { PopupService } from '../../services/popup.service';
import { PopupConfig }  from '../../models/popup.model';
import { Product }      from '../../models/product.model';

@Component({
  selector:    'app-popup',
  standalone:  true,
  imports:     [DecimalPipe],
  templateUrl: './popup.component.html',
  styleUrl:    './popup.component.css',
})
export class PopupComponent implements OnInit, OnDestroy {
  private readonly svc        = inject(PopupService);
  private readonly platformId = inject(PLATFORM_ID);

  visible = false;
  product: Product | undefined;
  config:  PopupConfig | null = null;

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.svc.visible$.subscribe(v => {
      this.visible = v;
      if (v) {
        this.product = this.svc.getProduct();
        this.config  = this.svc.getConfig();
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  close(): void { this.svc.close(); }

  shopNow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.svc.close();
    // Opens the product's Flipkart listing — consistent with product card behaviour
    if (this.product?.flipkartUrl) {
      window.open(this.product.flipkartUrl, '_blank', 'noopener,noreferrer');
    }
  }

  viewCollection(): void {
    this.svc.close();
    // Full-page navigation — avoids importing Router in a shared component
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = '/new-arrivals';
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pu-backdrop')) {
      this.close();
    }
  }
}
