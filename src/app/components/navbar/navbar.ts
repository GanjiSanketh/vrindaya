import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private platformId = inject(PLATFORM_ID);
  protected productService = inject(ProductService);

  readonly mobileMenuOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly scrolled = signal(false);
  searchQuery = '';

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 60);
    }
  }

  toggleMenu(): void { this.mobileMenuOpen.update(v => !v); }
  toggleSearch(): void { this.searchOpen.update(v => !v); }

  onSearch(): void {
    this.productService.setSearch(this.searchQuery);
    this.scrollTo('products');
  }

  scrollTo(id: string): void {
    this.mobileMenuOpen.set(false);
    this.searchOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  selectCategory(id: string): void {
    this.productService.setCategory(id);
    this.mobileMenuOpen.set(false);
    this.scrollTo('products');
  }
}
