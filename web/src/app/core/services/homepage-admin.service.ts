import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiHeroBanner, ApiPromotionalBanner, ApiCategory, ApiAnnouncement, ApiInstagramSection,
  ApiFooterBanner, ApiHomepageSeo,
} from '../models/homepage.model';
import { ApiCollection } from '../models/collection.model';

export interface UploadedAsset {
  url: string;
  publicId: string;
}

export interface HeroBannerInput {
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  backgroundImageUrl: string;
  backgroundImagePublicId: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  displayOrder: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
}

export interface PromotionalBannerInput {
  desktopImageUrl: string;
  desktopImagePublicId: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  buttonText?: string;
  buttonUrl?: string;
  displayOrder: number;
  active: boolean;
}

export interface CategoryInput {
  id?: string; // only sent on create
  name: string;
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

export interface CollectionInput {
  id?: string; // only sent on create
  name: string;
  description?: string;
  image?: string;
  imagePublicId?: string;
  bannerImage?: string;
  bannerImagePublicId?: string;
  displayOrder: number;
  featured: boolean;
  active: boolean;
  productIds: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
}

export interface HomepageConfigInput {
  featuredCollectionSlug: string;
  trendingCollectionSlug: string;
  newArrivalsOverrideIds: string[];
  announcement: ApiAnnouncement;
  instagram: ApiInstagramSection;
  footerBanner: ApiFooterBanner;
  seo: ApiHomepageSeo;
}

const HERO_URL = `${environment.apiBaseUrl}/hero-banners`;
const PROMO_URL = `${environment.apiBaseUrl}/promotional-banners`;
const CATEGORY_URL = `${environment.apiBaseUrl}/categories`;
const COLLECTION_URL = `${environment.apiBaseUrl}/collections`;
const CONFIG_URL = `${environment.apiBaseUrl}/homepage-config`;
const ASSETS_URL = `${environment.apiBaseUrl}/homepage-assets/images`;

/**
 * Admin-only HTTP client for every Homepage CMS resource — hero banners,
 * promotional banners, categories, collections, and the homepageConfig
 * singleton (which Collection slug powers Featured/Trending, the
 * New-Arrivals override list, + Announcement/Instagram/FooterBanner/Seo).
 * Mirrors ProductApiService's shape (plain firstValueFrom(http...) calls,
 * no eager full-catalog cache needed here since each admin screen only
 * ever loads its own small resource).
 */
@Injectable({ providedIn: 'root' })
export class HomepageAdminService {
  private readonly http = inject(HttpClient);

  /* ── Hero banners ── */
  getHeroBanners(): Promise<ApiHeroBanner[]> {
    return firstValueFrom(this.http.get<ApiHeroBanner[]>(HERO_URL));
  }
  getHeroBanner(id: string): Promise<ApiHeroBanner> {
    return firstValueFrom(this.http.get<ApiHeroBanner>(`${HERO_URL}/${id}`));
  }
  createHeroBanner(input: HeroBannerInput): Promise<ApiHeroBanner> {
    return firstValueFrom(this.http.post<ApiHeroBanner>(HERO_URL, input));
  }
  updateHeroBanner(id: string, input: HeroBannerInput): Promise<ApiHeroBanner> {
    return firstValueFrom(this.http.put<ApiHeroBanner>(`${HERO_URL}/${id}`, input));
  }
  deleteHeroBanner(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${HERO_URL}/${id}`));
  }

  /* ── Promotional banners ── */
  getPromotionalBanners(): Promise<ApiPromotionalBanner[]> {
    return firstValueFrom(this.http.get<ApiPromotionalBanner[]>(PROMO_URL));
  }
  getPromotionalBanner(id: string): Promise<ApiPromotionalBanner> {
    return firstValueFrom(this.http.get<ApiPromotionalBanner>(`${PROMO_URL}/${id}`));
  }
  createPromotionalBanner(input: PromotionalBannerInput): Promise<ApiPromotionalBanner> {
    return firstValueFrom(this.http.post<ApiPromotionalBanner>(PROMO_URL, input));
  }
  updatePromotionalBanner(id: string, input: PromotionalBannerInput): Promise<ApiPromotionalBanner> {
    return firstValueFrom(this.http.put<ApiPromotionalBanner>(`${PROMO_URL}/${id}`, input));
  }
  deletePromotionalBanner(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${PROMO_URL}/${id}`));
  }

  /* ── Categories ── */
  getAllCategories(): Promise<ApiCategory[]> {
    return firstValueFrom(this.http.get<ApiCategory[]>(`${CATEGORY_URL}/all`));
  }
  createCategory(input: CategoryInput): Promise<ApiCategory> {
    return firstValueFrom(this.http.post<ApiCategory>(CATEGORY_URL, input));
  }
  updateCategory(id: string, input: CategoryInput): Promise<ApiCategory> {
    return firstValueFrom(this.http.put<ApiCategory>(`${CATEGORY_URL}/${id}`, input));
  }
  /** Active-only — never re-sends Image/BannerImage, so a category with a legacy (pre-Firebase-Storage) image value can still be toggled without tripping the backend's [Url] validation. */
  updateCategoryStatus(id: string, active: boolean): Promise<ApiCategory> {
    return firstValueFrom(this.http.patch<ApiCategory>(`${CATEGORY_URL}/${id}/status`, { active }));
  }
  deleteCategory(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${CATEGORY_URL}/${id}`));
  }
  reorderCategories(orderedIds: string[]): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${CATEGORY_URL}/reorder`, { orderedIds }));
  }

  /* ── Collections ── */
  getAllCollections(): Promise<ApiCollection[]> {
    return firstValueFrom(this.http.get<ApiCollection[]>(`${COLLECTION_URL}/all`));
  }
  createCollection(input: CollectionInput): Promise<ApiCollection> {
    return firstValueFrom(this.http.post<ApiCollection>(COLLECTION_URL, input));
  }
  updateCollection(id: string, input: CollectionInput): Promise<ApiCollection> {
    return firstValueFrom(this.http.put<ApiCollection>(`${COLLECTION_URL}/${id}`, input));
  }
  /** Active-only — never re-sends Image/BannerImage, same reasoning as updateCategoryStatus. */
  updateCollectionStatus(id: string, active: boolean): Promise<ApiCollection> {
    return firstValueFrom(this.http.patch<ApiCollection>(`${COLLECTION_URL}/${id}/status`, { active }));
  }
  deleteCollection(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${COLLECTION_URL}/${id}`));
  }
  reorderCollections(orderedIds: string[]): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${COLLECTION_URL}/reorder`, { orderedIds }));
  }

  /* ── Homepage config (singleton) ── */
  getConfig(): Promise<HomepageConfigInput & { updatedAt: string }> {
    return firstValueFrom(this.http.get<HomepageConfigInput & { updatedAt: string }>(CONFIG_URL));
  }
  updateConfig(input: HomepageConfigInput): Promise<HomepageConfigInput & { updatedAt: string }> {
    return firstValueFrom(this.http.put<HomepageConfigInput & { updatedAt: string }>(CONFIG_URL, input));
  }

  /* ── Shared image upload/delete ── */
  uploadImage(section: string, file: File, onProgress?: (percent: number) => void): Promise<UploadedAsset> {
    const formData = new FormData();
    formData.append('section', section);
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

  deleteImage(publicId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(ASSETS_URL, { params: { publicId } }));
  }
}
