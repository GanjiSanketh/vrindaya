import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  HeroBanner,
  HeroBannerSavePayload,
  HeroBannerUploadedImage,
} from '../../../core/models/hero-banner.model';

const URL = `${environment.apiBaseUrl}/hero-banners/active`;

/**
 * Admin-only HTTP surface for hero banner management — uploads go to the
 * API (which stores images via ICloudinaryService) and the active Firestore
 * document is written by the API, never by the client directly, so the
 * AdminOnly policy is the enforcement boundary.
 */
@Injectable({ providedIn: 'root' })
export class HeroBannerAdminService {
  private readonly http = inject(HttpClient);

  /** Loads the current active banner, or null when none has been saved yet. */
  async getActive(): Promise<HeroBanner | null> {
    try {
      return await firstValueFrom(this.http.get<HeroBanner>(URL));
    } catch {
      return null;
    }
  }

  /** Overwrites the active banner document (Save Changes / Publish). */
  async save(payload: HeroBannerSavePayload): Promise<HeroBanner> {
    return firstValueFrom(this.http.put<HeroBanner>(URL, payload));
  }

  /** Uploads the desktop banner image to storage — Firestore is untouched. */
  async uploadDesktopImage(file: File): Promise<HeroBannerUploadedImage> {
    return this.upload('desktop-image', file);
  }

  /** Uploads the mobile banner image to storage — Firestore is untouched. */
  async uploadMobileImage(file: File): Promise<HeroBannerUploadedImage> {
    return this.upload('mobile-image', file);
  }

  /** Deletes a pending (unsaved) hero banner image by its storage path. */
  async deleteImage(storagePath: string): Promise<void> {
    await firstValueFrom(this.http.delete(URL, { params: { storagePath } }));
  }

  private upload(slot: 'desktop-image' | 'mobile-image', file: File): Promise<HeroBannerUploadedImage> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(
      this.http.post<HeroBannerUploadedImage>(`${URL}/${slot}`, formData),
    );
  }
}
