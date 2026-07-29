import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../models/product.model';
import { HttpCacheService } from './http-cache.service';

const URL = `${environment.apiBaseUrl}/categories`;
const SESSION_KEY = 'vrindaya_categories';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  readonly categories = signal<Category[]>([]);
  private loaded = false;

  async getAll(): Promise<Category[]> {
    if (this.loaded) return this.categories();

    const sessionCached = this.cache.getSession<Category[]>(SESSION_KEY);
    if (sessionCached) {
      this.categories.set(sessionCached);
      this.loaded = true;
      return sessionCached;
    }

    return this.fetchCategories();
  }

  async refresh(): Promise<Category[]> {
    this.loaded = false;
    return this.fetchCategories();
  }

  private async fetchCategories(): Promise<Category[]> {
    const cats = await firstValueFrom(
      this.http.get<Category[]>(URL).pipe(
        catchError(() => throwError(() => new Error('Could not load categories right now. Please try again.'))),
      ),
    );
    this.cache.setSession(SESSION_KEY, cats);
    this.categories.set(cats);
    this.loaded = true;
    return cats;
  }
}
