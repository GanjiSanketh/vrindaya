import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

const GSTIN_PATTERN = /^$|^[0-9A-Za-z]{15}$/;
const PAN_PATTERN = /^$|^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;

@Component({
  selector:    'app-supplier-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './supplier-form.component.html',
  styleUrl:    './supplier-form.component.css',
})
export class SupplierFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly svc    = inject(SupplierService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/suppliers`;

  readonly isEdit    = signal(false);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly formError = signal<string | null>(null);
  private supplierId = '';

  readonly form = this.fb.group({
    companyName: ['', Validators.required],
    contactPerson: [''],
    phone: [''],
    alternatePhone: [''],
    email: ['', Validators.email],
    gstin: ['', Validators.pattern(GSTIN_PATTERN)],
    pan: ['', Validators.pattern(PAN_PATTERN)],
    address: [''],
    city: [''],
    state: [''],
    country: [''],
    pincode: [''],
    bankDetails: [''],
    paymentTerms: [''],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.isEdit.set(true);
    this.supplierId = idParam;
    this.loading.set(true);
    try {
      const supplier = await this.svc.getOne(this.supplierId);
      this.form.patchValue({
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson ?? '',
        phone: supplier.phone ?? '',
        alternatePhone: supplier.alternatePhone ?? '',
        email: supplier.email ?? '',
        gstin: supplier.gstin ?? '',
        pan: supplier.pan ?? '',
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        state: supplier.state ?? '',
        country: supplier.country ?? '',
        pincode: supplier.pincode ?? '',
        bankDetails: supplier.bankDetails ?? '',
        paymentTerms: supplier.paymentTerms ?? '',
        notes: supplier.notes ?? '',
      });
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to load supplier.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.formError.set(null);
    this.saving.set(true);
    const v = this.form.getRawValue();

    const payload = {
      companyName: v.companyName!.trim(),
      contactPerson: v.contactPerson?.trim() || null,
      phone: v.phone?.trim() || null,
      alternatePhone: v.alternatePhone?.trim() || null,
      email: v.email?.trim() || null,
      gstin: v.gstin?.trim().toUpperCase() || null,
      pan: v.pan?.trim().toUpperCase() || null,
      address: v.address?.trim() || null,
      city: v.city?.trim() || null,
      state: v.state?.trim() || null,
      country: v.country?.trim() || null,
      pincode: v.pincode?.trim() || null,
      bankDetails: v.bankDetails?.trim() || null,
      paymentTerms: v.paymentTerms?.trim() || null,
      notes: v.notes?.trim() || null,
    };

    try {
      if (this.isEdit()) {
        await this.svc.update(this.supplierId, payload);
      } else {
        await this.svc.create(payload);
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save supplier.');
      this.saving.set(false);
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
