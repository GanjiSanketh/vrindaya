import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { COMMUNITY_ITEMS, CommunityItem } from '../../data/community';

@Component({
  selector: 'app-community-showcase',
  imports: [CommonModule],
  templateUrl: './community-showcase.html',
  styleUrl: './community-showcase.css',
})
export class CommunityShowcase {
  private platformId = inject(PLATFORM_ID);

  readonly items = COMMUNITY_ITEMS;
  readonly activeItem = signal<CommunityItem | null>(null);

  openModal(item: CommunityItem): void {
    this.activeItem.set(item);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(): void {
    this.activeItem.set(null);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  navigate(dir: 1 | -1): void {
    const current = this.activeItem();
    if (!current) return;
    const idx = this.items.findIndex((i) => i.id === current.id);
    const next = this.items[(idx + dir + this.items.length) % this.items.length];
    this.activeItem.set(next);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.activeItem()) this.closeModal();
  }

  @HostListener('document:keydown.arrowleft')
  onPrev(): void {
    if (this.activeItem()) this.navigate(-1);
  }

  @HostListener('document:keydown.arrowright')
  onNext(): void {
    if (this.activeItem()) this.navigate(1);
  }

  scrollToProducts(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.opacity = '0.3';
  }
}
