import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HomepageAdminService, PromotionalBannerInput } from '../../../../../core/services/homepage-admin.service';
import { SingleImageUploadComponent } from '../../../components/single-image-upload/single-image-upload.component';
import { APP_ROUTES } from '../../../../../core/constants/routes.constants';

@Component({
  selector:    'app-promotional-banner-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, SingleImageUploadComponent],
  templateUrl: './promotional-banner-form.component.html',
  styleUrl:    './promotional-banner-form.component.css',
})
export class PromotionalBannerFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly admin  = inject(HomepageAdminService);

  readonly BASE      = `/${APP_ROUTES.ADMIN}/homepage/promotional-banners`;
  readonly isEdit     = signal(false);
  readonly saving     = signal(false);
  readonly saved      = signal(false);
  readonly formError  = signal<string | null>(null);
  private bannerId    = '';

  readonly desktopImage = signal<{ url: string; publicId: string } | null>(null);
  readonly mobileImage  = signal<{ url: string; publicId: string } | null>(null);

  readonly form = this.fb.group({
    buttonText:   [''],
    buttonUrl:    [''],
    displayOrder: [0],
    active:       [true],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.bannerId = idParam;
      const banner = await this.admin.getPromotionalBanner(idParam);

      this.form.patchValue({
        buttonText: banner.buttonText ?? '',
        buttonUrl: banner.buttonUrl ?? '',
        displayOrder: banner.displayOrder,
        active: banner.active,
      });

      this.desktopImage.set({ url: banner.desktopImageUrl, publicId: banner.desktopImagePublicId });
      if (banner.mobileImageUrl && banner.mobileImagePublicId) {
        this.mobileImage.set({ url: banner.mobileImageUrl, publicId: banner.mobileImagePublicId });
      }
    }
  }

  async submit(): Promise<void> {
    if (!this.desktopImage()) { this.formError.set('Upload a desktop image before saving.'); return; }

    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();
    const desktop = this.desktopImage()!;
    const mobile = this.mobileImage();

    const input: PromotionalBannerInput = {
      desktopImageUrl: desktop.url,
      desktopImagePublicId: desktop.publicId,
      mobileImageUrl: mobile?.url,
      mobileImagePublicId: mobile?.publicId,
      buttonText: v.buttonText?.trim() || undefined,
      buttonUrl: v.buttonUrl?.trim() || undefined,
      displayOrder: Number(v.displayOrder) || 0,
      active: !!v.active,
    };

    try {
      if (this.isEdit()) {
        await this.admin.updatePromotionalBanner(this.bannerId, input);
      } else {
        await this.admin.createPromotionalBanner(input);
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save banner.');
      this.saving.set(false);
    }
  }

  onDesktopUploaded(result: { url: string; publicId: string }): void { this.desktopImage.set(result); }
  onDesktopRemoved(): void { this.desktopImage.set(null); }
  onMobileUploaded(result: { url: string; publicId: string }): void { this.mobileImage.set(result); }
  onMobileRemoved(): void { this.mobileImage.set(null); }
}
