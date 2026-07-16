import { Routes } from '@angular/router';

export const SHOP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/shop-page/shop-page.component').then(m => m.ShopPageComponent),
  },
];
