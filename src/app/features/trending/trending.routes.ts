import { Routes } from '@angular/router';

export const TRENDING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/trending-page/trending-page.component').then(m => m.TrendingPageComponent),
  },
];
