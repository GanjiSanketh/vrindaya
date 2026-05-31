import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../shared/product.service';
import { CATEGORIES } from '../../data/categories';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private productService = inject(ProductService);
  private platformId = inject(PLATFORM_ID);

  readonly categories = CATEGORIES;
  searchInput = '';
  mobileMenuOpen = signal(false);
  searchOpen = signal(false);
  scrolled = signal(false);

  selectedCategory = this.productService.selectedCategory;

  /** Left nav: Home + first 4 categories */
  get leftCats() { return this.categories.slice(1, 5); }
  /** Right nav: remaining categories */
  get rightCats() { return this.categories.slice(5); }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 12);
    }
  }

  onSearchInput(): void {
    this.productService.setSearch(this.searchInput);
  }

  /** Select a product category and scroll to the products grid */
  selectAndScroll(categoryId: string): void {
    this.productService.setCategory(categoryId);
    this.mobileMenuOpen.set(false);
    this.scrollTo('products');
  }

  scrollTo(id: string): void {
    this.mobileMenuOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  clearSearch(): void {
    this.searchInput = '';
    this.productService.setSearch('');
  }
}
