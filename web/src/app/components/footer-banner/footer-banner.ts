import { Component, input } from '@angular/core';
import { FooterBanner } from '../../core/models/homepage.model';

@Component({
  selector: 'app-footer-banner',
  standalone: true,
  templateUrl: './footer-banner.html',
  styleUrl: './footer-banner.css',
})
export class FooterBannerComponent {
  /** Null when inactive in the admin's Homepage Settings — supplied by the home page's single GET /homepage fetch. */
  readonly banner = input<FooterBanner | null>(null);
}
