import { Routes } from '@angular/router';

export const NEW_ARRIVALS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/new-arrivals-page/new-arrivals-page.component').then(m => m.NewArrivalsPageComponent),
  },
];
