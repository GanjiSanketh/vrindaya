import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  HeroShowcase,
  HeroShowcaseSavePayload,
  HeroShowcaseUploadedImage,
} from '../../../core/models/hero-showcase.model';

const URL = `${environment.apiBaseUrl}/homepage-config/hero-showcase`;

/**
 * Admin-only HTTP surface for Hero Showcase management — uploads go to the
 * API (which stores images via ICloudinaryService, the shared Cloudinary
 * service) and the homepageConfig/active Firestore document is written by
 * the API, never by the client directly, so the AdminOnly policy is the
 * enforcement boundary. Reads are public.
 */
@Injectable({ providedIn: 'root' })
export class HeroShowcaseAdminService {
  private readonly http = inject(HttpClient);

  /** Loads the current hero showcase configuration, or null when none has been saved yet. */
  async getConfig(): Promise<HeroShowcase | null> {
    try {
      return await firstValueFrom(this.http.get<HeroShowcase>(URL));
    } catch {
      return null;
    }
  }

  /** Overwrites the heroShowcase object on homepageConfig/active (Save Configuration). */
  async save(payload: HeroShowcaseSavePayload): Promise<HeroShowcase> {
    return firstValueFrom(this.http.put<HeroShowcase>(URL, payload));
  }

  /** Uploads one showcase item image to storage — Firestore is untouched. */
  async uploadImage(file: File): Promise<HeroShowcaseUploadedImage> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<HeroShowcaseUploadedImage>(`${URL}/items/images`, formData));
  }

  /** Deletes a showcase item image by its storage path. */
  async deleteImage(storagePath: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${URL}/items/images`, { params: { storagePath } }));
  }
}
