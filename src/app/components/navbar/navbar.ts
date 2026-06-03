import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly svc        = inject(ProductService);

  readonly categories     = this.svc.categories;
  readonly mobileMenuOpen = signal(false);
  readonly scrolled       = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 60);
    }
  }

  toggleMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMenu():  void { this.mobileMenuOpen.set(false); }
}
