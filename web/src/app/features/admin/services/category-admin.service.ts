import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  code?: string;
  subtitle?: string;
  description?: string;
  image: string;
  imagePublicId?: string;
  bannerImage?: string;
  bannerImagePublicId?: string;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  id: string;
  name: string;
  code?: string;
  subtitle?: string;
  description?: string;
  image: string;
  imagePublicId?: string;
  bannerImage?: string;
  bannerImagePublicId?: string;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
}

export type UpdateCategoryPayload = Omit<CreateCategoryPayload, 'id'>;

const URL = `${environment.apiBaseUrl}/categories`;

@Injectable({ providedIn: 'root' })
export class CategoryAdminService {
  private readonly http = inject(HttpClient);

  async getAll(): Promise<AdminCategory[]> {
    return firstValueFrom(this.http.get<AdminCategory[]>(`${URL}/all`));
  }

  async create(payload: CreateCategoryPayload): Promise<AdminCategory> {
    return firstValueFrom(this.http.post<AdminCategory>(URL, payload));
  }

  async update(id: string, payload: UpdateCategoryPayload): Promise<AdminCategory> {
    return firstValueFrom(this.http.put<AdminCategory>(`${URL}/${id}`, payload));
  }

  async updateStatus(id: string, active: boolean): Promise<AdminCategory> {
    return firstValueFrom(this.http.patch<AdminCategory>(`${URL}/${id}/status`, { active }));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${URL}/${id}`));
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.patch(`${URL}/reorder`, { orderedIds }));
  }

  async uploadImage(id: string, file: File): Promise<AdminCategory> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<AdminCategory>(`${URL}/${id}/image`, formData));
  }

  async removeImage(id: string): Promise<AdminCategory> {
    return firstValueFrom(this.http.delete<AdminCategory>(`${URL}/${id}/image`));
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<AdminCategory> {
    return firstValueFrom(this.http.patch<AdminCategory>(`${URL}/${id}/image-url`, { imageUrl }));
  }

  async uploadBannerImage(id: string, file: File): Promise<AdminCategory> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<AdminCategory>(`${URL}/${id}/banner-image`, formData));
  }

  async removeBannerImage(id: string): Promise<AdminCategory> {
    return firstValueFrom(this.http.delete<AdminCategory>(`${URL}/${id}/banner-image`));
  }
}
