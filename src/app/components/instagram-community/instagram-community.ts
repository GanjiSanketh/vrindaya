import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { SOCIAL_LINKS } from '../../core/constants/app.constants';

@Component({
  selector: 'app-instagram-community',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instagram-community.html',
  styleUrl: './instagram-community.css',
})
export class InstagramCommunity {
  readonly images = inject(ProductService).instaImages;
  readonly instagramUrl = SOCIAL_LINKS.INSTAGRAM;
}
