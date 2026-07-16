import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from './http-cache.service';
import { ApiBrandConfig, BrandConfig, apiBrandConfigToBrandConfig } from '../models/brand.model';

const URL = `${environment.apiBaseUrl}/brand-config`;
const CACHE_TTL_MS = 5 * 60_000; // brand content rarely changes

/** Public, cached source for About Us/Contact/Store Info/Social Links/FAQs/Policies/Footer — read by the footer and every Brand public page. */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async getConfig(): Promise<BrandConfig> {
    const dto = await firstValueFrom(
      this.cache.get(URL, () => this.http.get<ApiBrandConfig>(URL).pipe(
        catchError(() => throwError(() => new Error('Could not load site content right now. Please try again.'))),
      ), CACHE_TTL_MS),
    );
    return apiBrandConfigToBrandConfig(dto);
  }
}
