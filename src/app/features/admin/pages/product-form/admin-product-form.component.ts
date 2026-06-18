import {
  Component, inject, OnInit, OnDestroy, signal
} from '@angular/core';
import {
  FormBuilder, ReactiveFormsModule, Validators, AbstractControl
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { merge, Subject }                     from 'rxjs';
import { debounceTime, takeUntil }            from 'rxjs/operators';

import { AdminProductService } from '../../services/admin-product.service';
import { APP_ROUTES }          from '../../../../core/constants/routes.constants';
import { Product }             from '../../../../core/models/product.model';

interface CategoryOption { id: string; label: string; }

@Component({
  selector:    'app-admin-product-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrl:    './admin-product-form.component.css',
})
export class AdminProductFormComponent implements OnInit, OnDestroy {
  private readonly fb      = inject(FormBuilder);
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);
  readonly svc             = inject(AdminProductService);

  readonly BASE    = `/${APP_ROUTES.ADMIN}`;
  readonly isEdit  = signal(false);
  readonly saved   = signal(false);
  readonly saving  = signal(false);
  private editId   = 0;
  private destroy$ = new Subject<void>();

  readonly galleryFields = ['gallery0', 'gallery1', 'gallery2', 'gallery3'] as const;

  readonly categories: CategoryOption[] = [
    { id: 'long-kurtas',   label: 'Long Kurtas' },
    { id: 'short-kurtas',  label: 'Short Kurtas' },
    { id: '2-piece-sets',  label: '2-Piece Kurta Sets' },
    { id: '3-piece-sets',  label: '3-Piece Kurta Sets' },
  ];

  readonly form = this.fb.group({
    name:          ['', [Validators.required, Validators.minLength(3)]],
    categoryId:    ['long-kurtas', Validators.required],
    price:         [null as number | null, [Validators.required, Validators.min(1)]],
    originalPrice: [null as number | null, [Validators.required, Validators.min(1)]],
    discount:      [{ value: 0, disabled: false }],
    rating:        [4.5, [Validators.required, Validators.min(0), Validators.max(5)]],
    description:   [''],
    fabric:        [''],
    flipkartUrl:   ['', Validators.required],
    image:         ['', Validators.required],
    gallery0:      [''],
    gallery1:      [''],
    gallery2:      [''],
    gallery3:      [''],
    isNew:         [false],
    isTrending:    [false],
    isBestSeller:  [false],
  });

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const id = Number(idParam);
      const p  = this.svc.getById(id);
      if (p) {
        this.isEdit.set(true);
        this.editId = id;
        this.populateForm(p);
      }
    }

    // Auto-calculate discount when price / originalPrice changes
    merge(
      this.form.controls['price'].valueChanges,
      this.form.controls['originalPrice'].valueChanges,
    ).pipe(debounceTime(120), takeUntil(this.destroy$))
     .subscribe(() => {
       const price = this.form.value.price ?? 0;
       const orig  = this.form.value.originalPrice ?? 0;
       if (price > 0 && orig >= price) {
         const disc = Math.max(0, Math.round((1 - price / orig) * 100));
         this.form.controls['discount'].setValue(disc, { emitEvent: false });
       }
     });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private populateForm(p: Product): void {
    this.form.patchValue({
      name:          p.name,
      categoryId:    p.categoryId ?? 'long-kurtas',
      price:         p.price,
      originalPrice: p.originalPrice,
      discount:      p.discount,
      rating:        p.rating,
      description:   p.description ?? '',
      fabric:        p.fabric ?? '',
      flipkartUrl:   p.flipkartUrl,
      image:         p.image,
      gallery0:      p.gallery?.[0] ?? '',
      gallery1:      p.gallery?.[1] ?? '',
      gallery2:      p.gallery?.[2] ?? '',
      gallery3:      p.gallery?.[3] ?? '',
      isNew:         p.isNew        ?? false,
      isTrending:    p.isTrending   ?? false,
      isBestSeller:  p.isBestSeller ?? false,
    });
  }

  private categoryLabel(id: string): string {
    return this.categories.find(c => c.id === id)?.label ?? id;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    const v = this.form.getRawValue();

    const gallery = [v.gallery0, v.gallery1, v.gallery2, v.gallery3]
      .filter((s): s is string => !!s?.trim());

    const data: Omit<Product, 'id'> = {
      name:          v.name!.trim(),
      category:      this.categoryLabel(v.categoryId!),
      categoryId:    v.categoryId!,
      price:         v.price!,
      originalPrice: v.originalPrice!,
      discount:      v.discount ?? 0,
      rating:        v.rating ?? 4.5,
      description:   v.description?.trim() || undefined,
      fabric:        v.fabric?.trim() || undefined,
      flipkartUrl:   v.flipkartUrl!.trim(),
      image:         v.image!.trim(),
      gallery:       gallery.length ? gallery : undefined,
      isNew:         v.isNew  ?? false,
      isTrending:    v.isTrending  ?? false,
      isBestSeller:  v.isBestSeller ?? false,
    };

    if (this.isEdit()) {
      this.svc.updateProduct(this.editId, data);
    } else {
      this.svc.addProduct(data);
    }

    this.saved.set(true);
    this.saving.set(false);
    setTimeout(() => this.router.navigate([this.BASE + '/products']), 800);
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  galleryValue(field: 'gallery0' | 'gallery1' | 'gallery2' | 'gallery3'): string | null {
    return this.form.value[field] ?? null;
  }
}
