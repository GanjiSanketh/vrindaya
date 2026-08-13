import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  VrindayaStoryConfig,
  VrindayaStorySavePayload,
  VrindayaStoryUploadedImage,
} from '../../../core/models/vrindaya-story.model';

const URL = `${environment.apiBaseUrl}/homepage-config/vrindaya-story`;

/**
 * Admin-only HTTP surface for Vrindaya Story management — uploads go to the
 * API (which stores images via ICloudinaryService, the shared Cloudinary
 * service) and the homepageConfig/active Firestore document is written by
 * the API, never by the client directly, so the AdminOnly policy is the
 * enforcement boundary. Reads are public.
 */
@Injectable({ providedIn: 'root' })
export class VrindayaStoryAdminService {
  private readonly http = inject(HttpClient);

  /** Loads the current Vrindaya Story configuration, or null when none has been saved yet. */
  async getConfig(): Promise<VrindayaStoryConfig | null> {
    try {
      return await firstValueFrom(this.http.get<VrindayaStoryConfig>(URL));
    } catch {
      return null;
    }
  }

  /** Overwrites the vrindayaStory object on homepageConfig/active (Save Configuration). */
  async save(payload: VrindayaStorySavePayload): Promise<VrindayaStoryConfig> {
    return firstValueFrom(this.http.put<VrindayaStoryConfig>(URL, payload));
  }

  /** Uploads one story item image to storage — Firestore is untouched. */
  async uploadImage(file: File): Promise<VrindayaStoryUploadedImage> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<VrindayaStoryUploadedImage>(`${URL}/items/images`, formData));
  }

  /** Deletes a story item image by its storage path. */
  async deleteImage(storagePath: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${URL}/items/images`, { params: { storagePath } }));
  }
}
