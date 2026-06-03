import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'category/:id',
    loadComponent: () =>
      import('./pages/product-listing/product-listing.component')
        .then(m => m.ProductListingComponent),
  },
  {
    path: 'new-arrivals',
    loadComponent: () =>
      import('./pages/new-arrivals-page/new-arrivals-page.component')
        .then(m => m.NewArrivalsPageComponent),
  },
  {
    path: 'trending',
    loadComponent: () =>
      import('./pages/trending-page/trending-page.component')
        .then(m => m.TrendingPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
