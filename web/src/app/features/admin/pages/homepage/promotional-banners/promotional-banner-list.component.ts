import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomepageAdminService } from '../../../../../core/services/homepage-admin.service';
import { ApiPromotionalBanner } from '../../../../../core/models/homepage.model';
import { APP_ROUTES } from '../../../../../core/constants/routes.constants';

@Component({
  selector:    'app-promotional-banner-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './promotional-banner-list.component.html',
  styleUrl:    './promotional-banner-list.component.css',
})
export class PromotionalBannerListComponent {
  private readonly admin = inject(HomepageAdminService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/homepage/promotional-banners`;

  readonly banners  = signal<ApiPromotionalBanner[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly deleteId = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.banners.set(await this.admin.getPromotionalBanners());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load promotional banners.');
    } finally {
      this.loading.set(false);
    }
  }

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    try {
      await this.admin.deletePromotionalBanner(id);
      this.banners.update(list => list.filter(b => b.id !== id));
    } finally {
      this.deleteId.set(null);
    }
  }
}
