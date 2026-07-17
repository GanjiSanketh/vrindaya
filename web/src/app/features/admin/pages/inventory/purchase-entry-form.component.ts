import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../models/supplier.model';
import { PURCHASE_STATUS_OPTIONS } from '../../models/inventory.model';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { Product } from '../../../../core/models/product.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-purchase-entry-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink],
  templateUrl: './purchase-entry-form.component.html',
  styleUrl:    './purchase-entry-form.component.css',
})
export class PurchaseEntryFormComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly router   = inject(Router);
  private readonly route    = inject(ActivatedRoute);
  private readonly svc      = inject(InventoryService);
  private readonly supplierSvc = inject(SupplierService);
  private readonly productApi = inject(ProductApiService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly suppliersBase = `/${APP_ROUTES.ADMIN}/suppliers`;
  readonly STATUS_OPTIONS = PURCHASE_STATUS_OPTIONS;

  readonly isEdit    = signal(false);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly saved     = signal(false);
  readonly formError = signal<string | null>(null);
  private purchaseId = '';

  /** Active suppliers for the picker — a small, admin-curated list (same "load once" reasoning as Category/Collection lists). */
  readonly suppliers = signal<Supplier[]>([]);

  /** Per-row live product search — index-keyed so each row has its own query/results. */
  readonly searchQuery   = signal<Record<number, string>>({});
  readonly searchResults = signal<Record<number, Product[]>>({});
  readonly searching     = signal<Record<number, boolean>>({});

  readonly form = this.fb.group({
    supplierId: ['', Validators.required],
    invoiceNumber: ['', Validators.required],
    invoiceDate: ['', Validators.required],
    purchaseDate: ['', Validators.required],
    status: ['Draft', Validators.required],
    remarks: [''],
    items: this.fb.array([this.newItemGroup()]),
  });

  async ngOnInit(): Promise<void> {
    await this.loadSuppliers();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.isEdit.set(true);
    this.purchaseId = idParam;
    this.loading.set(true);
    try {
      const entry = await this.svc.getPurchaseEntry(this.purchaseId);
      this.form.patchValue({
        supplierId: entry.supplierId ?? '',
        invoiceNumber: entry.invoiceNumber,
        invoiceDate: entry.invoiceDate.substring(0, 10),
        purchaseDate: entry.purchaseDate.substring(0, 10),
        status: entry.status,
        remarks: entry.remarks ?? '',
      });

      this.items.clear();
      entry.items.forEach((item, index) => {
        const group = this.newItemGroup();
        group.patchValue({
          productId: item.productId,
          productLabel: item.productName ? `${item.productName}` : item.productId,
          color: item.color ?? '',
          size: item.size ?? '',
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          discount: item.discount,
          gst: item.gst,
          tax: item.tax,
        });
        this.items.push(group);
        this.searchQuery.update(m => ({ ...m, [index]: group.value.productLabel }));
      });
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to load purchase entry.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSuppliers(): Promise<void> {
    try {
      const page = await this.supplierSvc.getAll(null, 100, undefined, true);
      this.suppliers.set(page.items);
    } catch {
      // Non-fatal — the picker just shows empty; the form's own error surfaces on submit if truly needed.
    }
  }

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  private newItemGroup(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      productLabel: [''],
      color: ['', Validators.required],
      size: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0, [Validators.min(0)]],
      gst: [0, [Validators.min(0), Validators.max(100)]],
      tax: [0, [Validators.min(0), Validators.max(100)]],
    });
  }

  addItem(): void {
    this.items.push(this.newItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(index);
  }

  async onSearchInput(index: number, query: string): Promise<void> {
    this.searchQuery.update(m => ({ ...m, [index]: query }));
    this.items.at(index).patchValue({ productId: '', productLabel: query });

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.searchResults.update(m => ({ ...m, [index]: [] }));
      return;
    }

    this.searching.update(m => ({ ...m, [index]: true }));
    try {
      const page = await this.productApi.queryPaged({ deleted: false, pageSize: 8, search: trimmed });
      this.searchResults.update(m => ({ ...m, [index]: page.items }));
    } finally {
      this.searching.update(m => ({ ...m, [index]: false }));
    }
  }

  selectProduct(index: number, product: Product): void {
    this.items.at(index).patchValue({ productId: product.id, productLabel: `${product.name} (${product.sku})` });
    this.searchResults.update(m => ({ ...m, [index]: [] }));
    this.searchQuery.update(m => ({ ...m, [index]: `${product.name} (${product.sku})` }));
  }

  /** Live per-line total — same formula InventoryManagementService.ComputeItemTotal uses server-side, so what you see here is exactly what Save persists. */
  lineTotal(group: FormGroup): number {
    const v = group.value;
    const subtotal = (Number(v.quantity) || 0) * (Number(v.purchasePrice) || 0);
    const taxable = Math.max(0, subtotal - (Number(v.discount) || 0));
    const gstAmount = taxable * (Number(v.gst) || 0) / 100;
    const taxAmount = taxable * (Number(v.tax) || 0) / 100;
    return taxable + gstAmount + taxAmount;
  }

  grandTotal(): number {
    return this.items.controls.reduce((sum, group) => sum + this.lineTotal(group), 0);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const missingProduct = this.items.controls.some(c => !c.value.productId);
    if (missingProduct) {
      this.formError.set('Select a product for every line item.');
      return;
    }

    const selectedSupplier = this.suppliers().find(s => s.id === this.form.value.supplierId);
    if (!selectedSupplier) {
      this.formError.set('Select a supplier.');
      return;
    }

    this.formError.set(null);
    this.saving.set(true);
    const v = this.form.getRawValue();

    const payload = {
      supplier: selectedSupplier.companyName,
      supplierId: selectedSupplier.id,
      invoiceNumber: v.invoiceNumber!.trim(),
      invoiceDate: new Date(v.invoiceDate!).toISOString(),
      purchaseDate: new Date(v.purchaseDate!).toISOString(),
      remarks: v.remarks?.trim() || null,
      status: v.status as 'Draft' | 'Confirmed' | 'Cancelled',
      items: v.items!.map(i => ({
        productId: i['productId']!,
        color: (i['color'] ?? '').trim(),
        size: (i['size'] ?? '').trim(),
        quantity: Number(i['quantity']) || 0,
        purchasePrice: Number(i['purchasePrice']) || 0,
        discount: Number(i['discount']) || 0,
        gst: Number(i['gst']) || 0,
        tax: Number(i['tax']) || 0,
      })),
    };

    try {
      if (this.isEdit()) {
        await this.svc.updatePurchase(this.purchaseId, payload);
      } else {
        await this.svc.recordPurchase(payload);
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([`${this.BASE}/purchase-entries`]), 700);
    } catch (err) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save purchase entry.');
      this.saving.set(false);
    }
  }

  isInvalid(group: FormGroup, ctrl: string): boolean {
    const c = group.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  formIsInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
