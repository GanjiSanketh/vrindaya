import { Component, HostListener, inject, signal, computed, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser }                       from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd }   from '@angular/router';
import { takeUntilDestroyed }                                    from '@angular/core/rxjs-interop';
import { ProductService }                                        from '../../core/services/product.service';
import { SearchService }                                         from '../../core/services/search.service';
import { WishlistService }                                       from '../../core/services/wishlist.service';
import { AnalyticsService }                                      from '../../core/analytics/analytics.service';
import { SCROLL_THRESHOLDS }                                     from '../../core/constants/app.constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly prodSvc    = inject(ProductService);
  private readonly searchSvc  = inject(SearchService);
  private readonly router     = inject(Router);
  private readonly analytics  = inject(AnalyticsService);
  readonly wishlist           = inject(WishlistService);

  readonly categories     = this.prodSvc.categories;
  readonly mobileMenuOpen = signal(false);
  readonly scrolled       = signal(false);
  readonly isHomePage     = signal(true);

  readonly showScrolled = computed(() => this.scrolled() || !this.isHomePage());

  constructor() {
    this.isHomePage.set(this.router.url.split('?')[0] === '/');
    this.router.events.pipe(
      takeUntilDestroyed(),
    ).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isHomePage.set(this.router.url.split('?')[0] === '/');
      }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > SCROLL_THRESHOLDS.NAVBAR);
    }
  }

  toggleMenu():  void { this.mobileMenuOpen.update(v => !v); }
  closeMenu():   void { this.mobileMenuOpen.set(false); }
  openSearch():  void { this.searchSvc.open(); }

  onNavClick(label: string): void {
    this.analytics.trackNavClick(label);
  }

  onCategoryNavClick(id: string, label: string): void {
    this.analytics.trackCategoryClick(id);
    this.analytics.trackNavClick(label);
  }

  onSearchOpen(): void {
    this.analytics.trackNavClick('Search');
    this.searchSvc.open();
  }
}
