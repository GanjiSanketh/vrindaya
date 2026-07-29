import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryAdminService } from '../../services/category-admin.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { validateImageFile, formatFileSize } from '../../../../shared/utils/image-processing.util';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

@Component({
  selector:    'app-category-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './category-form.component.html',
  styleUrl:    './category-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly admin  = inject(CategoryAdminService);

  readonly BASE      = `/${APP_ROUTES.ADMIN}/categories`;
  readonly isEdit     = signal(false);
  readonly saving     = signal(false);
  readonly saved      = signal(false);
  readonly formError  = signal<string | null>(null);

  readonly imageFile = signal<File | null>(null);
  readonly imagePreview = signal<string | null>(null);
  readonly uploadingImage = signal(false);
  readonly removingImage = signal(false);
  readonly imageValidationError = signal<string | null>(null);
  readonly compressionInfo = signal<string | null>(null);
  readonly showPreview = signal(false);

  private categoryId  = '';

  readonly imageUrl       = signal('');
  readonly bannerImageUrl = signal('');

  readonly form = this.fb.group({
    id:              ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    name:            ['', Validators.required],
    code:            ['', [Validators.maxLength(10), Validators.pattern(/^[A-Z0-9]{1,10}$/)]],
    subtitle:        [''],
    description:     [''],
    displayOrder:    [0],
    featured:        [false],
    active:          [true],
    seoTitle:        [''],
    seoDescription:  [''],
    seoKeywords:     [''],
    imageUrl:        [''],
    bannerImageUrl:  [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.categoryId = idParam;

      const all = await this.admin.getAll();
      const cat = all.find(c => c.id === idParam);
      if (!cat) { this.formError.set('Category not found.'); return; }

      this.form.patchValue({
        id: cat.id, name: cat.name, code: cat.code ?? '', subtitle: cat.subtitle ?? '', description: cat.description ?? '',
        displayOrder: cat.displayOrder, featured: cat.featured ?? false, active: cat.active,
        seoTitle: cat.seoTitle ?? '', seoDescription: cat.seoDescription ?? '',
        seoKeywords: (cat.seoKeywords ?? []).join(', '),
        imageUrl: cat.image, bannerImageUrl: cat.bannerImage ?? '',
      });
      this.imageUrl.set(cat.image);
      this.form.get('id')!.disable();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);

    if (this.uploadingImage()) {
      this.formError.set('Please wait for image processing to complete.');
      this.saving.set(false);
      return;
    }

    const v = this.form.getRawValue();

    const payload = {
      name: v.name!.trim(),
      code: v.code?.trim().toUpperCase() || undefined,
      subtitle: v.subtitle?.trim() || undefined,
      description: v.description?.trim() || undefined,
      image: v.imageUrl!.trim() || this.imageUrl(),
      imagePublicId: undefined,
      bannerImage: v.bannerImageUrl?.trim() || undefined,
      bannerImagePublicId: undefined,
      displayOrder: Number(v.displayOrder) || 0,
      featured: !!v.featured,
      active: !!v.active,
      seoTitle: v.seoTitle?.trim() || undefined,
      seoDescription: v.seoDescription?.trim() || undefined,
      seoKeywords: (v.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (this.isEdit()) {
        await this.admin.update(this.categoryId, payload);
        if (this.imageFile()) {
          this.uploadingImage.set(true);
          const updated = await this.admin.uploadImage(this.categoryId, this.imageFile()!);
          this.imageUrl.set(updated.image);
          this.form.patchValue({ imageUrl: updated.image });
          this.uploadingImage.set(false);
        }
      } else {
        const created = await this.admin.create({ id: v.id!.trim(), ...payload });
        if (this.imageFile()) {
          this.uploadingImage.set(true);
          await this.admin.uploadImage(created.id, this.imageFile()!);
          this.uploadingImage.set(false);
        }
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save category.');
      this.saving.set(false);
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.imageValidationError.set(null);
    this.compressionInfo.set(null);

    const validationErr = validateImageFile(file);
    if (validationErr) {
      this.imageValidationError.set(validationErr);
      input.value = '';
      return;
    }

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      this.imageValidationError.set('Please choose a JPG, PNG, or WebP image.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.imageValidationError.set(`Image is too large (max ${MAX_IMAGE_SIZE / (1024 * 1024)} MB).`);
      input.value = '';
      return;
    }

    try {
      const { processImageForUpload } = await import('../../../../shared/utils/image-processing.util');
      const processed = await processImageForUpload(file);
      this.imageFile.set(new File([processed.blob], file.name, { type: 'image/webp' }));
      this.imagePreview.set(processed.previewUrl);
      this.compressionInfo.set(`${file.type.split('/')[1].toUpperCase()} ${file.size >= 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB'} → WebP ${formatFileSize(processed.sizeBytes)} (${processed.width}×${processed.height})`);
    } catch (err) {
      this.imageValidationError.set(err instanceof Error ? err.message : 'Invalid image');
    }
  }

  async removeExistingImage(): Promise<void> {
    if (!this.categoryId || this.removingImage()) return;
    this.removingImage.set(true);
    this.formError.set(null);
    try {
      await this.admin.removeImage(this.categoryId);
      this.imageUrl.set('');
      this.imagePreview.set(null);
      this.imageFile.set(null);
      this.form.patchValue({ imageUrl: '' });
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to remove image.');
    } finally {
      this.removingImage.set(false);
    }
  }

  clearSelectedImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.compressionInfo.set(null);
    this.imageValidationError.set(null);
  }

  hasCurrentImage(): boolean {
    return !!this.imagePreview() || !!this.imageUrl();
  }

  currentImageSrc(): string {
    return this.imagePreview() || this.imageUrl() || '';
  }
}
