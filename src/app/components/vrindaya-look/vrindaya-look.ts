import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-vrindaya-look',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vrindaya-look.html',
  styleUrl: './vrindaya-look.css',
})
export class VrindayaLook {
  private platformId = inject(PLATFORM_ID);
  protected svc = inject(ProductService);

  readonly items = this.svc.lookItems;

  explore(categoryId: string): void {
    this.svc.setCategory(categoryId);
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
