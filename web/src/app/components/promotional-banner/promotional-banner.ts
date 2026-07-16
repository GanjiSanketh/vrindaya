import { Component, input } from '@angular/core';
import { PromotionalBanner } from '../../core/models/homepage.model';

@Component({
  selector: 'app-promotional-banner',
  standalone: true,
  templateUrl: './promotional-banner.html',
  styleUrl: './promotional-banner.css',
})
export class PromotionalBannerComponent {
  /** Every currently-active banner, admin-ordered — supplied by the home page's single GET /homepage fetch. */
  readonly banners = input<PromotionalBanner[]>([]);
}
