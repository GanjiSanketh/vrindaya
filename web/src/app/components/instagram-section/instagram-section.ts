import { Component, input } from '@angular/core';
import { InstagramSection } from '../../core/models/homepage.model';

@Component({
  selector: 'app-instagram-section',
  standalone: true,
  templateUrl: './instagram-section.html',
  styleUrl: './instagram-section.css',
})
export class InstagramSectionComponent {
  /** Null when disabled in the admin's Homepage Settings — supplied by the home page's single GET /homepage fetch. */
  readonly instagram = input<InstagramSection | null>(null);
}
