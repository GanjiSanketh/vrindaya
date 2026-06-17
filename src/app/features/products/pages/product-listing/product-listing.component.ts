import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink }                             from '@angular/router';
import { Subscription }                                           from 'rxjs';
import { ProductService, SortOrder }                              from '../../../../core/services/product.service';
import { Category }                                               from '../../../../core/models/product.model';
import { ProductCard }                                            from '../../../../shared/components/product-card/product-card';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './product-listing.component.html',
  styleUrl: './product-listing.component.css',
})
export class ProductListingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(ProductService);
  private paramSub!: Subscription;

  readonly categoryId = signal('');
  readonly sortOrder  = signal<SortOrder>('default');

  readonly category = computed<Category | undefined>(() =>
    this.svc.categories.find(c => c.id === this.categoryId())
  );

  readonly products = computed(() => {
    const raw = this.svc.getByCategory(this.categoryId());
    switch (this.sortOrder()) {
      case 'price-asc':  return [...raw].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...raw].sort((a, b) => b.price - a.price);
      case 'rating':     return [...raw].sort((a, b) => b.rating - a.rating);
      default:           return raw;
    }
  });

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id') ?? '';
      if (this.svc.categories.some(c => c.id === id)) {
        this.categoryId.set(id);
        this.sortOrder.set('default');
      }
    });
  }

  ngOnDestroy(): void { this.paramSub.unsubscribe(); }

  setSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as SortOrder);
  }
}
