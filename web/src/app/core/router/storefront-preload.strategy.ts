import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Preloads storefront lazy modules after first paint, but NEVER the admin
 * module — admin code must never be downloaded by the public site.
 *
 * Routes can opt out individually with `data: { preload: false }`.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontPreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === false || route.path === 'admin') {
      return of(null);
    }
    return load();
  }
}
