import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductService } from './product.service';
import { Product } from '../models/product.model';

export interface PostResult {
  imageUrl: string;
  caption: string;
  hashtags: string;
}

export interface ReelResult {
  videoUrl: string;
  caption: string;
  hashtags: string;
  music: string;
}

export interface Draft {
  id: string;
  contentType: string;
  caption: string;
  hashtags: string;
  tone: string;
  cta: string;
  savedAt: string;
}

export interface MarketingGenerateRequest {
  contentType: string;
  contentSource: string;
  selectedProduct: string;
  topic: string;
  theme: string;
  targetAudience: string;
  tone: string;
  campaignGoal: string;
  cta: string;
}

@Injectable({ providedIn: 'root' })
export class MarketingStudioService {
  private readonly http = inject(HttpClient);
  private readonly productService = inject(ProductService);

  private readonly _searchQuery = signal('');
  private readonly _categoryFilter = signal('');

  readonly searchQuery = this._searchQuery.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();

  readonly products = computed(() => {
    const query = this._searchQuery().toLowerCase().trim();
    const category = this._categoryFilter();
    let list = this.productService.allProducts;

    if (category) {
      list = list.filter(p => p.category === category);
    }

    if (query) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
      );
    }

    return list;
  });

  readonly categories = this.productService.categories;

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setCategoryFilter(category: string): void {
    this._categoryFilter.set(category);
  }

  generatePost(request: MarketingGenerateRequest): Observable<PostResult> {
    return this.http.post<PostResult>(`${environment.apiBaseUrl}/marketing/generate-post`, request).pipe(
      catchError(() => of({
        imageUrl: '',
        caption: 'Unable to generate caption at this time.',
        hashtags: '#Fashion #Style #InstaGood',
      })),
    );
  }

  generateReel(request: MarketingGenerateRequest): Observable<ReelResult> {
    return this.http.post<ReelResult>(`${environment.apiBaseUrl}/marketing/generate-reel`, request).pipe(
      catchError(() => of({
        videoUrl: '',
        caption: 'Unable to generate reel at this time.',
        hashtags: '#Reel #Fashion #Style',
        music: 'Aesthetic Chill — Lo-Fi Beats for Content Creation',
      })),
    );
  }

  saveDraft(): Observable<Draft> {
    return of({
      id: 'draft-1',
      contentType: 'post',
      caption: '',
      hashtags: '',
      tone: 'luxury',
      cta: '',
      savedAt: new Date().toISOString(),
    });
  }
}