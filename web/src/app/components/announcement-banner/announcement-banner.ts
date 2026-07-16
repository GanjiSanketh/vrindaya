import { Component, input } from '@angular/core';
import { Announcement } from '../../core/models/homepage.model';

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  templateUrl: './announcement-banner.html',
  styleUrl: './announcement-banner.css',
})
export class AnnouncementBannerComponent {
  /** Null when disabled in the admin's Homepage Settings — supplied by the home page's single GET /homepage fetch. */
  readonly announcement = input<Announcement | null>(null);
}
