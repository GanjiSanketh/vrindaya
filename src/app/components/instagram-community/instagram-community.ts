import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-instagram-community',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instagram-community.html',
  styleUrl: './instagram-community.css',
})
export class InstagramCommunity {
  readonly images = inject(ProductService).instaImages;
}
