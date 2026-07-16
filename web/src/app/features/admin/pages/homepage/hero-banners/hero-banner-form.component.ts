import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HomepageAdminService, HeroBannerInput } from '../../../../../core/services/homepage-admin.service';
import { SingleImageUploadComponent } from '../../../components/single-image-upload/single-image-upload.component';
import { APP_ROUTES } from '../../../../../core/constants/routes.constants';

@Component({
  selector:    'app-hero-banner-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, SingleImageUploadComponent],
  templateUrl: './hero-banner-form.component.html',
  styleUrl:    './hero-banner-form.component.css',
})
export class HeroBannerFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly admin  = inject(HomepageAdminService);

  readonly BASE      = `/${APP_ROUTES.ADMIN}/homepage/hero-banners`;
  readonly isEdit     = signal(false);
  readonly saving     = signal(false);
  readonly saved      = signal(false);
  readonly formError  = signal<string | null>(null);
  private bannerId    = '';

  readonly backgroundImage = signal<{ url: string; publicId: string } | null>(null);
  readonly mobileImage     = signal<{ url: string; publicId: string } | null>(null);

  readonly form = this.fb.group({
    title:      ['', [Validators.required, Validators.maxLength(200)]],
    subtitle:   [''],
    buttonText: [''],
    buttonUrl:  [''],
    displayOrder: [0],
    startDate:  [''],
    endDate:    [''],
    active:     [true],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.bannerId = idParam;
      const banner = await this.admin.getHeroBanner(idParam);

      this.form.patchValue({
        title: banner.title,
        subtitle: banner.subtitle ?? '',
        buttonText: banner.buttonText ?? '',
        buttonUrl: banner.buttonUrl ?? '',
        displayOrder: banner.displayOrder,
        startDate: banner.startDate ? banner.startDate.substring(0, 10) : '',
        endDate: banner.endDate ? banner.endDate.substring(0, 10) : '',
        active: banner.active,
      });

      this.backgroundImage.set({ url: banner.backgroundImageUrl, publicId: banner.backgroundImagePublicId });
      if (banner.mobileImageUrl && banner.mobileImagePublicId) {
        this.mobileImage.set({ url: banner.mobileImageUrl, publicId: banner.mobileImagePublicId });
      }
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.backgroundImage()) { this.formError.set('Upload a background image before saving.'); return; }

    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();
    const bg = this.backgroundImage()!;
    const mobile = this.mobileImage();

    const input: HeroBannerInput = {
      title: v.title!.trim(),
      subtitle: v.subtitle?.trim() || undefined,
      buttonText: v.buttonText?.trim() || undefined,
      buttonUrl: v.buttonUrl?.trim() || undefined,
      backgroundImageUrl: bg.url,
      backgroundImagePublicId: bg.publicId,
      mobileImageUrl: mobile?.url,
      mobileImagePublicId: mobile?.publicId,
      displayOrder: Number(v.displayOrder) || 0,
      startDate: v.startDate ? new Date(v.startDate).toISOString() : null,
      endDate: v.endDate ? new Date(v.endDate).toISOString() : null,
      active: !!v.active,
    };

    try {
      if (this.isEdit()) {
        await this.admin.updateHeroBanner(this.bannerId, input);
      } else {
        await this.admin.createHeroBanner(input);
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save banner.');
      this.saving.set(false);
    }
  }

  onBackgroundUploaded(result: { url: string; publicId: string }): void { this.backgroundImage.set(result); }
  onBackgroundRemoved(): void { this.backgroundImage.set(null); }
  onMobileUploaded(result: { url: string; publicId: string }): void { this.mobileImage.set(result); }
  onMobileRemoved(): void { this.mobileImage.set(null); }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
