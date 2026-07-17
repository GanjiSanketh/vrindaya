import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiFlipkartSettings } from '../models/flipkart-settings.model';

const URL = `${environment.apiBaseUrl}/marketplace-settings/flipkart`;

@Injectable({ providedIn: 'root' })
export class FlipkartSettingsService {
  private readonly http = inject(HttpClient);

  getSettings(): Promise<ApiFlipkartSettings> {
    return firstValueFrom(this.http.get<ApiFlipkartSettings>(URL));
  }

  updateSettings(input: Omit<ApiFlipkartSettings, 'marketplaceName' | 'updatedAt'>): Promise<ApiFlipkartSettings> {
    return firstValueFrom(this.http.put<ApiFlipkartSettings>(URL, input));
  }
}
