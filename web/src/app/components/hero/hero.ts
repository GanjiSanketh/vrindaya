import { Component, input } from '@angular/core';
import { HeroBanner } from '../../core/models/homepage.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  /** Null until the homepage's one aggregated fetch resolves, or if no banner currently qualifies — renders today's fallback copy either way. */
  readonly banner = input<HeroBanner | null>(null);
}
