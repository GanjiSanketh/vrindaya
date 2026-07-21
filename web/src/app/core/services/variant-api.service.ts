import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { ProductVariant, CreateVariantRequest, UpdateVariantRequest } from '../models/product-variant.model';

export interface VariantUploadResponse {
  url: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class VariantApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}`;

  getVariants(productId: string) {
    return this.http.get<ProductVariant[]>(`${this.base}/products/${productId}/variants`);
  }

  getVariant(variantId: string) {
    return this.http.get<ProductVariant>(`${this.base}/variants/${variantId}`);
  }

  createVariant(productId: string, request: CreateVariantRequest) {
    return this.http.post<ProductVariant>(`${this.base}/products/${productId}/variants`, request);
  }

  updateVariant(variantId: string, request: UpdateVariantRequest) {
    return this.http.put<ProductVariant>(`${this.base}/variants/${variantId}`, request);
  }

  deleteVariant(variantId: string) {
    return this.http.delete<void>(`${this.base}/variants/${variantId}`);
  }

  uploadVariantImage(productId: string, variantId: string, slot: string, file: File) {
    const fd = new FormData();
    fd.append('slot', slot);
    fd.append('file', file);
    return this.http.post<VariantUploadResponse>(
      `${this.base}/products/${productId}/variants/${variantId}/images`, fd,
    );
  }

  deleteVariantImage(productId: string, variantId: string, publicId: string) {
    return this.http.delete<void>(
      `${this.base}/products/${productId}/variants/${variantId}/images`,
      { params: { publicId } },
    );
  }

  generateVariantId() {
    return this.http.post<{ id: string }>(`${this.base}/variants/ids`, {});
  }
}
