import { Component, computed, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                                 from '@angular/common';
import { RouterLink }                                        from '@angular/router';
import { ProductService }                                    from '../../../../core/services/product.service';
import { ProductCard }                                       from '../../../../shared/components/product-card/product-card';
import { SeoService }                                        from '../../../../core/services/seo.service';

@Component({
  selector: 'app-new-arrivals-page',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './new-arrivals-page.component.html',
  styleUrl: './new-arrivals-page.component.css',
})
export class NewArrivalsPageComponent implements OnInit {
  private readonly svc        = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);

  readonly products = computed(() => [...this.svc.newArrivals()].sort((a, b) => b.id - a.id));

  ngOnInit(): void {
    this.seo.setPage({
      title:       'New Arrivals',
      description: 'Shop the latest Indian ethnic wear at Vrindaya. Freshly added kurtas, kurta sets and sarees. Free delivery across India.',
      keywords:    ['new arrivals', 'latest kurta', 'new ethnic wear', 'new indian fashion'],
      url:         '/new-arrivals',
    });
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
