import {
  Component, effect, HostListener, inject, PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LightboxService } from '../../../core/services/lightbox.service';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-lightbox.component.html',
  styleUrl:    './image-lightbox.component.css',
})
export class ImageLightboxComponent {
  readonly svc = inject(LightboxService);
  private readonly pid = inject(PLATFORM_ID);

  private touchStartX = 0;

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.pid)) {
        document.body.style.overflow = this.svc.isOpen() ? 'hidden' : '';
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.svc.isOpen()) return;
    if (e.key === 'ArrowRight') { this.svc.next(); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { this.svc.prev(); e.preventDefault(); }
    if (e.key === 'Escape')     { this.svc.close(); }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void { this.touchStartX = e.changedTouches[0].clientX; }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) > 40) { dx > 0 ? this.svc.prev() : this.svc.next(); }
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('lb-backdrop')) this.svc.close();
  }
}
