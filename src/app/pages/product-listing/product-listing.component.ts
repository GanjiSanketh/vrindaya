import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../../components/product-card/product-card';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { Category } from '../../models/product.model';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [RouterLink, ProductCard, Navbar, Footer],
  templateUrl: './product-listing.component.html',
  styleUrl: './product-listing.component.css',
})
export class ProductListingComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc    = inject(ProductService);

  readonly categoryId = signal('');

  readonly category = computed<Category | undefined>(() =>
    this.svc.categories.find(c => c.id === this.categoryId())
  );

  readonly products = computed(() =>
    this.svc.getByCategory(this.categoryId())
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.svc.categories.some(c => c.id === id)) {
      this.router.navigate(['/']);
      return;
    }
    this.categoryId.set(id);
  }
}
