import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HomepageAdminService } from '../../../../core/services/homepage-admin.service';
import { SingleImageUploadComponent } from '../../components/single-image-upload/single-image-upload.component';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-category-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, SingleImageUploadComponent],
  templateUrl: './category-form.component.html',
  styleUrl:    './category-form.component.css',
})
export class CategoryFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly admin  = inject(HomepageAdminService);

  readonly BASE      = `/${APP_ROUTES.ADMIN}/categories`;
  readonly isEdit     = signal(false);
  readonly saving     = signal(false);
  readonly saved      = signal(false);
  readonly formError  = signal<string | null>(null);
  private categoryId  = '';

  readonly image       = signal<{ url: string; publicId: string } | null>(null);
  readonly bannerImage = signal<{ url: string; publicId: string } | null>(null);

  readonly form = this.fb.group({
    id:              ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    name:            ['', Validators.required],
    subtitle:        [''],
    description:     [''],
    displayOrder:    [0],
    featured:        [false],
    active:          [true],
    seoTitle:        [''],
    seoDescription:  [''],
    seoKeywords:     [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.categoryId = idParam;

      const all = await this.admin.getAllCategories();
      const cat = all.find(c => c.id === idParam);
      if (!cat) { this.formError.set('Category not found.'); return; }

      this.form.patchValue({
        id: cat.id, name: cat.name, subtitle: cat.subtitle ?? '', description: cat.description ?? '',
        displayOrder: cat.displayOrder, featured: cat.featured ?? false, active: cat.active,
        seoTitle: cat.seoTitle ?? '', seoDescription: cat.seoDescription ?? '',
        seoKeywords: (cat.seoKeywords ?? []).join(', '),
      });
      this.form.get('id')!.disable();
      this.image.set({ url: cat.image, publicId: cat.imagePublicId ?? '' });
      if (cat.bannerImage) this.bannerImage.set({ url: cat.bannerImage, publicId: cat.bannerImagePublicId ?? '' });
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.image()) { this.formError.set('Upload an image before saving.'); return; }

    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();
    const img = this.image()!;
    const banner = this.bannerImage();

    const payload = {
      name: v.name!.trim(),
      subtitle: v.subtitle?.trim() || undefined,
      description: v.description?.trim() || undefined,
      image: img.url,
      imagePublicId: img.publicId,
      bannerImage: banner?.url,
      bannerImagePublicId: banner?.publicId,
      displayOrder: Number(v.displayOrder) || 0,
      featured: !!v.featured,
      active: !!v.active,
      seoTitle: v.seoTitle?.trim() || undefined,
      seoDescription: v.seoDescription?.trim() || undefined,
      seoKeywords: (v.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (this.isEdit()) {
        await this.admin.updateCategory(this.categoryId, payload);
      } else {
        await this.admin.createCategory({ id: v.id!.trim(), ...payload });
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save category.');
      this.saving.set(false);
    }
  }

  onImageUploaded(result: { url: string; publicId: string }): void { this.image.set(result); }
  onImageRemoved(): void { this.image.set(null); }

  onBannerUploaded(result: { url: string; publicId: string }): void { this.bannerImage.set(result); }
  onBannerRemoved(): void { this.bannerImage.set(null); }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
