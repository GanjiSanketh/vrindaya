import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models/product.model';
import { HttpCacheService } from './http-cache.service';

const URL = `${environment.apiBaseUrl}/categories`;
const CACHE_TTL_MS = 5 * 60_000; // categories rarely change

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async getAll(): Promise<Category[]> {
    return firstValueFrom(
      this.cache.get(URL, () => this.http.get<Category[]>(URL).pipe(
        catchError(() => throwError(() => new Error('Could not load categories right now. Please try again.'))),
      ), CACHE_TTL_MS),
    );
  }
}
