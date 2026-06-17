import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'app-why-vrindaya',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './why-vrindaya.html',
  styleUrl: './why-vrindaya.css',
})
export class WhyVrindaya {
  readonly features = inject(ProductService).features;
}
