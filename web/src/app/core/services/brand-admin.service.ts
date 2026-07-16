import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiBrandConfig } from '../models/brand.model';

const CONFIG_URL = `${environment.apiBaseUrl}/brand-config`;
const ASSETS_URL = `${environment.apiBaseUrl}/homepage-assets/images`;

export interface UploadedAsset {
  url: string;
  publicId: string;
}

/** Admin-only GET/PUT of the brandConfig/singleton document — mirrors HomepageAdminService's config methods exactly. */
@Injectable({ providedIn: 'root' })
export class BrandAdminService {
  private readonly http = inject(HttpClient);

  getConfig(): Promise<ApiBrandConfig> {
    return firstValueFrom(this.http.get<ApiBrandConfig>(CONFIG_URL));
  }

  updateConfig(input: Omit<ApiBrandConfig, 'updatedAt'>): Promise<ApiBrandConfig> {
    return firstValueFrom(this.http.put<ApiBrandConfig>(CONFIG_URL, input));
  }

  /** Shared upload endpoint every CMS section already uses — "brand" is now in HomepageAssetsController's allowed-section list. */
  uploadImage(file: File, onProgress?: (percent: number) => void): Promise<UploadedAsset> {
    const formData = new FormData();
    formData.append('section', 'brand');
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      this.http.post<UploadedAsset>(ASSETS_URL, formData, {
        reportProgress: !!onProgress,
        observe: 'events',
      }).subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            onProgress?.(Math.round((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            resolve(event.body as UploadedAsset);
          }
        },
        error: err => reject(err instanceof Error ? err : new Error('Upload failed.')),
      });
    });
  }
}
