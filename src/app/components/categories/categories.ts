import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../shared/product.service';
import { CATEGORIES } from '../../data/categories';

@Component({
  selector: 'app-categories',
  imports: [CommonModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private productService = inject(ProductService);

  readonly categories = CATEGORIES;
  readonly selectedCategory = this.productService.selectedCategory;

  selectCategory(categoryId: string): void {
    this.productService.setCategory(categoryId);
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
