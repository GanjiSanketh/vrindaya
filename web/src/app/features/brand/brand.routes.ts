import { Routes } from '@angular/router';

/** About Us / Contact / FAQ / Policy — registered individually in app.routes.ts under /about, /contact, /faq, /policies since each is a distinct top-level path, not a shared prefix. */
export const ABOUT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/about-page/about-page.component').then(m => m.AboutPageComponent) },
];

export const CONTACT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/contact-page/contact-page.component').then(m => m.ContactPageComponent) },
];

export const FAQ_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/faq-page/faq-page.component').then(m => m.FaqPageComponent) },
];

export const POLICIES_ROUTES: Routes = [
  { path: ':slug', loadComponent: () => import('./pages/policy-page/policy-page.component').then(m => m.PolicyPageComponent) },
];
