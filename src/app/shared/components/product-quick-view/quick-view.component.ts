import {
  Component, computed, effect, HostListener,
  inject, PLATFORM_ID, signal, untracked,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { QuickViewService }  from '../../../core/services/quick-view.service';
import { LightboxService }   from '../../../core/services/lightbox.service';

@Component({
  selector: 'app-product-quick-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-view.component.html',
  styleUrl:    './quick-view.component.css',
})
export class ProductQuickViewComponent {
  readonly svc         = inject(QuickViewService);
  private readonly lb  = inject(LightboxService);
  private readonly pid = inject(PLATFORM_ID);

  readonly selectedIndex = signal(0);

  /** cover + all gallery images */
  readonly allImages = computed(() => {
    const p = this.svc.product();
    return p ? [p.image, ...(p.gallery ?? [])] : [];
  });

  readonly selectedImage = computed(() =>
    this.allImages()[this.selectedIndex()] ?? this.allImages()[0] ?? ''
  );

  constructor() {
    // Reset gallery index whenever a new product is opened
    effect(() => {
      this.svc.product();
      untracked(() => this.selectedIndex.set(0));
    });

    // Scroll-lock body while open
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

  openLightbox(): void {
    this.lb.open(this.allImages(), this.selectedIndex());
  }

  close(): void {
    this.selectedIndex.set(0);
    this.svc.close();
  }
}
