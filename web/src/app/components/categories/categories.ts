import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomepageCategory } from '../../core/models/homepage.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  /** Supplied by the home page's single GET /homepage fetch — see HomepageService. */
  readonly categories = input<HomepageCategory[]>([]);
}
