import {
  Component, computed, effect, HostListener,
  inject, PLATFORM_ID, signal, untracked,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { QuickViewService }  from '../../../core/services/quick-view.service';
import { LightboxService }   from '../../../core/services/lightbox.service';
import { WishlistService }   from '../../../core/services/wishlist.service';

@Component({
  selector: 'app-product-quick-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-view.component.html',
  styleUrl:    './quick-view.component.css',
})
export class ProductQuickViewComponent {
  readonly svc          = inject(QuickViewService);
  private readonly lb   = inject(LightboxService);
  private readonly wl   = inject(WishlistService);
  private readonly pid  = inject(PLATFORM_ID);

  readonly selectedIndex  = signal(0);
  readonly isZoomed       = signal(false);
  readonly transformOrigin = signal('50% 50%');

  readonly allImages = computed(() => {
    const p = this.svc.product();
    return p ? [p.image, ...(p.gallery ?? [])] : [];
  });

  readonly selectedImage = computed(() =>
    this.allImages()[this.selectedIndex()] ?? this.allImages()[0] ?? ''
  );

  readonly isWishlisted = computed(() => {
    const p = this.svc.product();
    return p ? this.wl.has(p.id) : false;
  });

  constructor() {
    effect(() => {
      this.svc.product();
      untracked(() => {
        this.selectedIndex.set(0);
        this.isZoomed.set(false);
      });
    });

    effect(() => {
      if (isPlatformBrowser(this.pid)) {
        document.body.style.overflow = this.svc.isOpen() ? 'hidden' : '';
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.svc.isOpen()) this.close(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('qv-backdrop')) this.close();
  }

  onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.transformOrigin.set(`${x}% ${y}%`);
    this.isZoomed.set(true);
  }

  onMouseLeave(): void {
    this.isZoomed.set(false);
    this.transformOrigin.set('50% 50%');
  }

  toggleWishlist(): void {
    const p = this.svc.product();
    if (p) this.wl.toggle(p.id);
  }

  openLightbox(): void {
    this.lb.open(this.allImages(), this.selectedIndex());
  }

  close(): void {
    this.isZoomed.set(false);
    this.selectedIndex.set(0);
    this.svc.close();
  }
}
