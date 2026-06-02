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
    path: '**',
    redirectTo: '',
  },
];
