import { Routes } from '@angular/router';

export const PRODUCT_DETAIL_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-detail-page/product-detail-page.component').then(m => m.ProductDetailPageComponent),
  },
];
