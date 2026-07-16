import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HomepageAdminService } from '../../../../../core/services/homepage-admin.service';
import { ApiHeroBanner } from '../../../../../core/models/homepage.model';
import { APP_ROUTES } from '../../../../../core/constants/routes.constants';

@Component({
  selector:    'app-hero-banner-list',
  standalone:  true,
  imports:     [RouterLink, DatePipe],
  templateUrl: './hero-banner-list.component.html',
  styleUrl:    './hero-banner-list.component.css',
})
export class HeroBannerListComponent {
  private readonly admin = inject(HomepageAdminService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/homepage/hero-banners`;

  readonly banners = signal<ApiHeroBanner[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly deleteId = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.banners.set(await this.admin.getHeroBanners());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load hero banners.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Mirrors the backend's GetActiveBannerAsync qualification — for admin visibility ("Currently Showing" badge) only. */
  isQualifying(b: ApiHeroBanner): boolean {
    if (!b.active) return false;
    const now = Date.now();
    if (b.startDate && new Date(b.startDate).getTime() > now) return false;
    if (b.endDate && new Date(b.endDate).getTime() < now) return false;
    return true;
  }

  isCurrentlyShowing(b: ApiHeroBanner): boolean {
    const qualifying = this.banners().filter(x => this.isQualifying(x)).sort((a, c) => a.displayOrder - c.displayOrder);
    return qualifying[0]?.id === b.id;
  }

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    try {
      await this.admin.deleteHeroBanner(id);
      this.banners.update(list => list.filter(b => b.id !== id));
    } finally {
      this.deleteId.set(null);
    }
  }
}
