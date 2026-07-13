import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-listing/product-listing.component').then(m => m.ProductListingComponent),
  },
];
