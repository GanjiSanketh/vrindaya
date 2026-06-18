import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser }                       from '@angular/common';
import { RouterLink, RouterLinkActive }                          from '@angular/router';
import { ProductService }                                        from '../../core/services/product.service';
import { SearchService }                                         from '../../core/services/search.service';
import { SCROLL_THRESHOLDS }                                     from '../../core/constants/app.constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly prodSvc    = inject(ProductService);
  private readonly searchSvc  = inject(SearchService);

  readonly categories     = this.prodSvc.categories;
  readonly mobileMenuOpen = signal(false);
  readonly scrolled       = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > SCROLL_THRESHOLDS.NAVBAR);
    }
  }

  toggleMenu():  void { this.mobileMenuOpen.update(v => !v); }
  closeMenu():   void { this.mobileMenuOpen.set(false); }
  openSearch():  void { this.searchSvc.open(); }
}
