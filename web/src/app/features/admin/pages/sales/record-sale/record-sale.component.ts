import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductApiService } from '../../../../../core/services/product-api.service';
import { CreateSaleRequest } from '../../../../../core/models/product-api.model';
import { Product } from '../../../../../core/models/product.model';

interface SizeOption { size: string; stock: number; }

interface VariantOption {
  id: string;
  colourName: string;
  colourHex: string | null;
  sizes: SizeOption[];
  purchaseCost: number;
  packagingCost: number;
}

@Component({
  selector: 'app-record-sale',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './record-sale.component.html',
  styleUrl: './record-sale.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordSaleComponent {
  private readonly api = inject(ProductApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly variants = signal<VariantOption[]>([]);
  readonly sizes = signal<SizeOption[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  selectedProductId = signal('');
  selectedVariantId = signal('');
  selectedSize = signal('');
  quantity = signal(1);
  saleChannel = signal('Offline');
  sellingPrice = signal(0);
  flipkartCommission = signal(0);
  shippingCharges = signal(0);
  marketingCost = signal(0);
  otherCharges = signal(0);
  paymentMethod = signal('Cash');
  customerName = signal('');
  customerPhone = signal('');
  invoiceNumber = signal('');
  notes = signal('');

  get purchaseCost(): number {
    return this.variants().find(v => v.id === this.selectedVariantId())?.purchaseCost ?? 0;
  }

  get packagingCost(): number {
    return this.variants().find(v => v.id === this.selectedVariantId())?.packagingCost ?? 0;
  }

  get totalCost(): number {
    return (this.purchaseCost + this.packagingCost + this.shippingCharges() + this.marketingCost() + this.otherCharges()) * this.quantity();
  }

  get amountReceived(): number {
    return (this.sellingPrice() - this.flipkartCommission()) * this.quantity();
  }

  get profit(): number {
    return this.amountReceived - this.totalCost;
  }

  get currentStock(): number {
    return this.sizes().find(s => s.size === this.selectedSize())?.stock ?? 0;
  }

  readonly channels = ['Offline', 'Flipkart', 'Website', 'Instagram', 'WhatsApp'];
  readonly paymentMethods = ['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Flipkart Payment'];

  constructor() {
    this.loadProducts();
  }

  private async loadProducts() {
    try {
      await this.api.ensureLoaded();
      this.products.set(this.api.products());
    } catch { /* ignore */ }
  }

  parseNum(v: string): number { return Number(v) || 0; }

  clampQuantity(v: string) {
    const num = Number(v) || 1;
    this.quantity.set(Math.min(Math.max(num, 1), this.currentStock || 1));
  }

  async onProductChange(productId: string) {
    this.selectedProductId.set(productId);
    this.selectedVariantId.set('');
    this.selectedSize.set('');
    this.sizes.set([]);
    this.sellingPrice.set(0);
    this.flipkartCommission.set(0);

    if (!productId) return;

    this.loading.set(true);
    try {
      const detail = await this.api.getById(productId);
      if (!detail) return;
      const rawVariants: any[] = (detail as any).variants || [];
      const opts: VariantOption[] = rawVariants.map((v: any) => ({
        id: v.id,
        colourName: v.colourName,
        colourHex: v.colourHex || null,
        sizes: (v.sizes || []).map((s: any) => ({ size: s.size, stock: s.stock })),
        purchaseCost: v.purchaseCost || 0,
        packagingCost: v.packagingCost || 0,
      }));
      this.variants.set(opts);
    } catch { /* ignore */ }
    finally { this.loading.set(false); }
  }

  onVariantChange(variantId: string) {
    this.selectedVariantId.set(variantId);
    this.selectedSize.set('');
    this.sellingPrice.set(0);

    const v = this.variants().find(v => v.id === variantId);
    if (!v) return;
    this.sizes.set(v.sizes.filter(s => s.stock > 0 || s.size === this.selectedSize()));
  }

  onSizeChange(size: string) {
    this.selectedSize.set(size);
  }

  canSave(): boolean {
    return !!(
      this.selectedProductId() &&
      this.selectedVariantId() &&
      this.selectedSize() &&
      this.quantity() > 0 &&
      this.quantity() <= this.currentStock &&
      this.sellingPrice() > 0 &&
      this.saleChannel()
    );
  }

  async save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set(null);

    const request: CreateSaleRequest = {
      productId: this.selectedProductId(),
      variantId: this.selectedVariantId(),
      size: this.selectedSize(),
      quantity: this.quantity(),
      saleChannel: this.saleChannel(),
      sellingPrice: this.sellingPrice(),
      flipkartCommission: this.flipkartCommission(),
      shippingCharges: this.shippingCharges(),
      marketingCost: this.marketingCost(),
      otherCharges: this.otherCharges(),
      paymentMethod: this.paymentMethod(),
      customerName: this.customerName() || undefined,
      customerPhone: this.customerPhone() || undefined,
      invoiceNumber: this.invoiceNumber() || undefined,
      notes: this.notes() || undefined,
    };

    try {
      if (this.editId()) {
        await firstValueFrom(this.api.updateSale(this.editId()!, request));
      } else {
        await firstValueFrom(this.api.createSale(request));
      }
      this.success.set('Sale recorded! Stock has been updated.');
      setTimeout(() => this.router.navigate(['../'], { relativeTo: this.route }), 1500);
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Failed to save sale');
    } finally {
      this.saving.set(false);
    }
  }
}
