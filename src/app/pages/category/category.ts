import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../../components/product-card/product-card';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { Category } from '../../models/product.model';

@Component({
  selector: 'app-category-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCard, Navbar, Footer],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryPage implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(ProductService);

  readonly categoryId = signal('');

  readonly category = computed<Category | undefined>(() =>
    this.svc.categories.find(c => c.id === this.categoryId())
  );

  readonly products = computed(() =>
    this.svc.getByCategory(this.categoryId())
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const valid = this.svc.categories.find(c => c.id === id);
    if (!valid) {
      this.router.navigate(['/']);
      return;
    }
    this.categoryId.set(id);
  }
}
