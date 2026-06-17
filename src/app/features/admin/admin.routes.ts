import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'popup-config',
    loadComponent: () =>
      import('./pages/popup-config/popup-config.component').then(m => m.PopupConfigComponent),
  },
];
