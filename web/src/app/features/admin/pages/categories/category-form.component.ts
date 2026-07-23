import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CategoryAdminService } from '../../services/category-admin.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

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
    imageUrl:        ['', Validators.required],
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
      this.form.get('id')!.disable();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);

    const v = this.form.getRawValue();

    const payload = {
      name: v.name!.trim(),
      code: v.code?.trim().toUpperCase() || undefined,
      subtitle: v.subtitle?.trim() || undefined,
      description: v.description?.trim() || undefined,
      image: v.imageUrl!.trim(),
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
      } else {
        await this.admin.create({ id: v.id!.trim(), ...payload });
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
}
