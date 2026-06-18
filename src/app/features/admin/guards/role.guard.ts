import { inject }             from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable }          from '@angular/core/rxjs-interop';
import { filter, map, take }     from 'rxjs/operators';

import { AdminAuthService } from '../services/admin-auth.service';
import { AdminRole }        from '../models/admin-user.model';
import { APP_ROUTES }       from '../../../core/constants/routes.constants';

/**
 * Factory guard — restricts a route to users whose role is in `allowedRoles`.
 *
 * Usage in routes:
 *   canActivate: [roleGuard(['super_admin'])]
 *   canActivate: [roleGuard(['super_admin', 'admin'])]
 *
 * - Unauthenticated users are redirected to /admin/login.
 * - Authenticated users without the required role are redirected to /admin/dashboard.
 * - Waits for the auth loading signal to resolve before making a decision.
 */
export const roleGuard = (allowedRoles: AdminRole[]): CanActivateFn => () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);

  const loginUrl     = `/${APP_ROUTES.ADMIN}/login`;
  const dashboardUrl = `/${APP_ROUTES.ADMIN}/dashboard`;

  const decide = () => {
    if (!auth.isAuthenticated()) return router.createUrlTree([loginUrl]);
    if (!auth.hasRole(allowedRoles)) return router.createUrlTree([dashboardUrl]);
    return true;
  };

  // If auth has already resolved, decide immediately
  if (!auth.isLoading()) return decide();

  // Otherwise wait for the first non-loading emission
  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    map(decide),
  );
};
