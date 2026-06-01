import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-customer-love',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-love.html',
  styleUrl: './customer-love.css',
})
export class CustomerLove {
  readonly testimonials = inject(ProductService).testimonials;

  stars(n: number): number[] { return Array(n).fill(0); }
}
