import { Component, HostListener, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { HeroBanner } from '../../components/hero-banner/hero-banner';
import { TrustBar } from '../../components/trust-bar/trust-bar';
import { Categories } from '../../components/categories/categories';
import { ProductGrid } from '../../components/product-grid/product-grid';
import { CommunityShowcase } from '../../components/community-showcase/community-showcase';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar, HeroBanner, TrustBar, Categories, ProductGrid, CommunityShowcase, Footer],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);

  readonly showScrollTop = signal(false);

  ngOnInit(): void {}

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showScrollTop.set(window.scrollY > 500);
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToSection(id: string): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
