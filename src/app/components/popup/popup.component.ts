import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DecimalPipe }                   from '@angular/common';
import { Subscription }                                      from 'rxjs';

import { PopupService } from '../../core/services/popup.service';
import { PopupConfig }  from '../../core/models/popup.model';
import { Product }      from '../../core/models/product.model';

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

  cardVisible  = false;
  modalVisible = false;
  product: Product | undefined;
  config:  PopupConfig | null = null;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.svc.floatingCard$.subscribe(v => {
        if (v) {
          this.product = this.svc.getProduct();
          this.config  = this.svc.getConfig();
        }
        this.cardVisible = v;
      }),
      this.svc.fullPopup$.subscribe(v => {
        if (v) {
          this.product = this.svc.getProduct();
          this.config  = this.svc.getConfig();
        }
        this.modalVisible = v;
      }),
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  openModal():   void { this.svc.openFullPopup(); }
  dismissCard(): void { this.svc.dismissFloatingCard(); }
  closeModal():  void { this.svc.closeFullPopup(); }

  shopNow(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.svc.closeFullPopup();
    if (this.product?.flipkartUrl) {
      window.open(this.product.flipkartUrl, '_blank', 'noopener,noreferrer');
    }
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
