import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HomepageAdminService } from '../../../../core/services/homepage-admin.service';
import { SingleImageUploadComponent } from '../../components/single-image-upload/single-image-upload.component';
import { ProductPickerComponent } from '../../components/product-picker/product-picker.component';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-collection-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, SingleImageUploadComponent, ProductPickerComponent],
  templateUrl: './collection-form.component.html',
  styleUrl:    './collection-form.component.css',
})
export class CollectionFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly admin  = inject(HomepageAdminService);

  readonly BASE       = `/${APP_ROUTES.ADMIN}/collections`;
  readonly isEdit      = signal(false);
  readonly saving      = signal(false);
  readonly saved       = signal(false);
  readonly formError   = signal<string | null>(null);
  private collectionId = '';

  readonly image       = signal<{ url: string; publicId: string } | null>(null);
  readonly bannerImage = signal<{ url: string; publicId: string } | null>(null);
  readonly productIds  = signal<string[]>([]);

  readonly form = this.fb.group({
    id:              ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    name:            ['', Validators.required],
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
      this.collectionId = idParam;

      const all = await this.admin.getAllCollections();
      const col = all.find(c => c.id === idParam);
      if (!col) { this.formError.set('Collection not found.'); return; }

      this.form.patchValue({
        id: col.id, name: col.name, description: col.description ?? '',
        displayOrder: col.displayOrder, featured: col.featured, active: col.active,
        seoTitle: col.seoTitle ?? '', seoDescription: col.seoDescription ?? '',
        seoKeywords: (col.seoKeywords ?? []).join(', '),
      });
      this.form.get('id')!.disable();
      if (col.image) this.image.set({ url: col.image, publicId: col.imagePublicId ?? '' });
      if (col.bannerImage) this.bannerImage.set({ url: col.bannerImage, publicId: col.bannerImagePublicId ?? '' });
      this.productIds.set(col.productIds);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();
    const img = this.image();
    const banner = this.bannerImage();

    const payload = {
      name: v.name!.trim(),
      description: v.description?.trim() || undefined,
      image: img?.url,
      imagePublicId: img?.publicId,
      bannerImage: banner?.url,
      bannerImagePublicId: banner?.publicId,
      displayOrder: Number(v.displayOrder) || 0,
      featured: !!v.featured,
      active: !!v.active,
      productIds: this.productIds(),
      seoTitle: v.seoTitle?.trim() || undefined,
      seoDescription: v.seoDescription?.trim() || undefined,
      seoKeywords: (v.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (this.isEdit()) {
        await this.admin.updateCollection(this.collectionId, payload);
      } else {
        await this.admin.createCollection({ id: v.id!.trim(), ...payload });
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save collection.');
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
