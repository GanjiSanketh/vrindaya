import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../shared/product.service';
import { CATEGORIES } from '../../data/categories';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private productService = inject(ProductService);

  readonly categories = CATEGORIES;
  searchInput = '';
  mobileMenuOpen = signal(false);
  mobileSearchOpen = signal(false);
  scrolled = signal(false);

  selectedCategory = this.productService.selectedCategory;

  ngOnInit(): void {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 60);
  }

  onSearchInput(): void {
    this.productService.setSearch(this.searchInput);
  }

  selectCategory(categoryId: string): void {
    this.productService.setCategory(categoryId);
    this.mobileMenuOpen.set(false);
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen.update((v) => !v);
    if (this.mobileSearchOpen()) {
      setTimeout(() => {
        const el = document.getElementById('mobile-search-input');
        if (el) (el as HTMLInputElement).focus();
      }, 100);
    }
  }

  scrollToSection(id: string): void {
    this.mobileMenuOpen.set(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
