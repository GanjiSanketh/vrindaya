import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiBaseUrl}/analytics`;

/** Public, best-effort click tracking for the "Buy on Flipkart" CTA — never blocks or breaks the redirect if the call fails. */
@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  recordClick(productId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void firstValueFrom(this.http.post<void>(`${BASE}/products/${productId}/click`, {})).catch(() => {});
  }
}
