import { Routes } from '@angular/router';

export const COLLECTIONS_ROUTES: Routes = [
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/collection-listing/collection-listing.component').then(m => m.CollectionListingComponent),
  },
];
