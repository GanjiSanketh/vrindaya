import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-customer-love',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-love.html',
  styleUrl: './customer-love.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class CustomerLove {
  readonly testimonials = inject(ProductService).testimonials;

  // Track which avatars failed to load so we can show initials instead
  readonly imgErrors = new Set<number>();

  stars(n: number): number[] { return Array(n).fill(0); }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  onImgError(id: number): void { this.imgErrors.add(id); }
}
