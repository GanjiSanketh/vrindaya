import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from './http-cache.service';
import {
  ApiCollection, ApiCollectionLanding, Collection, CollectionLanding,
  apiCollectionToCollection, apiCollectionLandingToCollectionLanding,
} from '../models/collection.model';

const BASE = `${environment.apiBaseUrl}/collections`;
const LIST_CACHE_TTL_MS = 5 * 60_000; // collections rarely change
const LANDING_CACHE_TTL_MS = 60_000;

/** Public collection reads — GET /collections (metadata list, powers collection search) and GET /collections/{slug} (the landing page's fully-resolved payload). */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async getAll(): Promise<Collection[]> {
    const list = await firstValueFrom(
      this.cache.get(BASE, () => this.http.get<ApiCollection[]>(BASE).pipe(
        catchError(() => throwError(() => new Error('Could not load collections right now. Please try again.'))),
      ), LIST_CACHE_TTL_MS),
    );
    return list.map(apiCollectionToCollection);
  }

  async getBySlug(slug: string): Promise<CollectionLanding> {
    const url = `${BASE}/${slug}`;
    const dto = await firstValueFrom(
      this.cache.get(url, () => this.http.get<ApiCollectionLanding>(url).pipe(
        catchError(() => throwError(() => new Error('Could not load this collection right now. Please try again.'))),
      ), LANDING_CACHE_TTL_MS),
    );
    return apiCollectionLandingToCollectionLanding(dto);
  }
}
