import {
  ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import { ProductQueryService, ProductNotFoundError } from '../../../../core/services/product-query.service';
import { VariantApiService } from '../../../../core/services/variant-api.service';
import { LightboxService } from '../../../../core/services/lightbox.service';
import { SeoService } from '../../../../core/services/seo.service';
import { Product } from '../../../../core/models/product.model';
import type { ProductVariant } from '../../../../core/models/product-variant.model';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { SkeletonGridComponent } from '../../../../shared/components/skeleton/skeleton-grid.component';

const RELATED_LIMIT = 8;

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [RouterLink, ProductCard, SkeletonGridComponent],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly query = inject(ProductQueryService);
  private readonly variantApi = inject(VariantApiService);
  private readonly lightbox = inject(LightboxService);
  private readonly seo = inject(SeoService);
  private paramSub!: Subscription;

  readonly product      = signal<Product | null>(null);
  readonly loading      = signal(true);
  readonly notFound     = signal(false);
  readonly error        = signal<string | null>(null);

  readonly relatedProducts = signal<Product[]>([]);
  readonly relatedLoading  = signal(false);

  readonly variants         = signal<ProductVariant[]>([]);
  readonly selectedVariantId = signal<string | null>(null);
  readonly variantLoading   = signal(false);

  readonly selectedVariant = computed(() => {
    const id = this.selectedVariantId();
    return this.variants().find(v => v.id === id) ?? this.variants()[0] ?? null;
  });

  readonly selectedIndex   = signal(0);
  readonly isZoomed        = signal(false);
  readonly transformOrigin = signal('50% 50%');

  readonly allImages = computed(() => {
    const v = this.selectedVariant();
    if (v) {
      const imgs: string[] = [];
      if (v.images.primary) imgs.push(v.images.primary);
      if (v.images.front)   imgs.push(v.images.front);
      if (v.images.back)    imgs.push(v.images.back);
      if (v.images.left)    imgs.push(v.images.left);
      if (v.images.right)   imgs.push(v.images.right);
      imgs.push(...v.images.gallery);
      if (imgs.length) return imgs;
    }
    const p = this.product();
    return p ? [p.image, ...(p.gallery ?? [])] : [];
  });

  readonly selectedImage = computed(() => this.allImages()[this.selectedIndex()] ?? this.allImages()[0] ?? '');

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) void this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.paramSub.unsubscribe();
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);
    this.selectedIndex.set(0);
    this.isZoomed.set(false);
    this.relatedProducts.set([]);

    try {
      const product = await this.query.getById(id);
      this.product.set(product);
      this.loading.set(false);
      this.applySeo(product);
      void this.loadRelated(product);
      void this.loadVariants(id);
    } catch (err) {
      this.loading.set(false);
      if (err instanceof ProductNotFoundError) {
        this.notFound.set(true);
      } else {
        this.error.set(err instanceof Error ? err.message : 'Could not load this product.');
      }
    }
  }

  private async loadVariants(productId: string): Promise<void> {
    this.variantLoading.set(true);
    try {
      const variants = await firstValueFrom(this.variantApi.getVariants(productId));
      this.variants.set(variants ?? []);
      if (variants?.length) {
        const first = variants.find(v => v.isActive) ?? variants[0];
        this.selectedVariantId.set(first.id);
      }
    } catch {
      this.variants.set([]);
    } finally {
      this.variantLoading.set(false);
    }
  }

  selectVariant(id: string): void {
    this.selectedVariantId.set(id);
    this.selectedIndex.set(0);
  }

  get sizes(): ProductVariant['sizes'] {
    return this.selectedVariant()?.sizes ?? this.product()?.sizes ?? [];
  }

  get flipkartUrl(): string | null {
    return this.selectedVariant()?.flipkartUrl ?? this.product()?.flipkartUrl ?? null;
  }

  private async loadRelated(product: Product): Promise<void> {
    this.relatedLoading.set(true);
    try {
      const related = await this.query.getRelated(product.category, product.id, RELATED_LIMIT);
      this.relatedProducts.set(related);
    } catch {
      this.relatedProducts.set([]);
    } finally {
      this.relatedLoading.set(false);
    }
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  selectImage(i: number): void {
    this.selectedIndex.set(i);
  }

  onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.transformOrigin.set(`${x}% ${y}%`);
    this.isZoomed.set(true);
  }

  onMouseLeave(): void {
    this.isZoomed.set(false);
    this.transformOrigin.set('50% 50%');
  }

  openLightbox(): void {
    this.lightbox.open(this.allImages(), this.selectedIndex());
  }

  shopOnFlipkart(): void {
    const url = this.flipkartUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  private applySeo(product: Product): void {
    const image = product.image;
    this.seo.setPage({
      title: product.name,
      description: product.shortDescription || product.description || `Shop ${product.name} at Vrindaya — premium Indian ethnic wear.`,
      keywords: [product.name.toLowerCase(), product.category.replace(/-/g, ' '), product.brand].filter(Boolean),
      url: `/product/${product.id}`,
      image,
      type: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': product.name,
        'image': image ? [image] : [],
        'description': product.description || product.shortDescription || '',
        'sku': product.sku,
        'brand': { '@type': 'Brand', 'name': product.brand || 'Vrindaya' },
        'offers': {
          '@type': 'Offer',
          'url': `https://vrindaya.in/product/${product.id}`,
          'priceCurrency': 'INR',
          'price': product.price,
          'availability': product.isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        },
      },
    });
  }
}
