import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from './http-cache.service';
import { ApiHomepage, Homepage, apiHomepageToHomepage } from '../models/homepage.model';

const URL = `${environment.apiBaseUrl}/homepage`;
const CACHE_TTL_MS = 60_000;

/**
 * The homepage's single data source — one GET /homepage call, cached
 * client-side (matching the backend's own 60s cache) and retried
 * automatically (retryInterceptor, already global for GET requests to the
 * API). Every homepage section (hero, featured/new-arrivals/trending
 * products, categories, promotional banners, announcement, Instagram,
 * footer banner, SEO) comes from this one response.
 */
@Injectable({ providedIn: 'root' })
export class HomepageService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async getHomepage(): Promise<Homepage> {
    const dto = await firstValueFrom(
      this.cache.get(URL, () => this.http.get<ApiHomepage>(URL).pipe(
        catchError(() => throwError(() => new Error('Could not load homepage content right now. Please try again.'))),
      ), CACHE_TTL_MS),
    );
    return apiHomepageToHomepage(dto);
  }
}
