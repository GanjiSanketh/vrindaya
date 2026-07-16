import { inject }                                    from '@angular/core';
import { CanActivateFn, Router }                      from '@angular/router';
import { toObservable }                               from '@angular/core/rxjs-interop';
import { filter, map, take, timeout, catchError }     from 'rxjs/operators';
import { of }                                         from 'rxjs';
import { AdminAuthService }                           from '../services/admin-auth.service';
import { AdminRole }                                  from '../models/admin-user.model';
import { APP_ROUTES }                                 from '../../../core/constants/routes.constants';
import { LoggerService }                              from '../../../core/services/logger.service';

/** Maximum ms to wait for auth to resolve before falling back to login. */
const GUARD_TIMEOUT = 20_000;

/**
 * Factory guard — restricts a route to users whose role is in `allowedRoles`.
 *
 * - Unauthenticated users → /admin/login
 * - Authenticated users without the required role → /admin/dashboard
 * - Waits up to GUARD_TIMEOUT ms for auth to resolve; redirects to login on timeout.
 */
export const roleGuard = (allowedRoles: AdminRole[]): CanActivateFn => () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const loginUrl     = `/${APP_ROUTES.ADMIN}/login`;
  const dashboardUrl = `/${APP_ROUTES.ADMIN}/dashboard`;

  const decide = () => {
    if (!auth.isAuthenticated()) {
      logger.log('[GUARD] roleGuard — not authenticated → login');
      return router.createUrlTree([loginUrl]);
    }
    if (!auth.hasRole(allowedRoles)) {
      logger.log('[GUARD] roleGuard — role', auth.currentRole(), 'not in', allowedRoles, '→ dashboard');
      return router.createUrlTree([dashboardUrl]);
    }
    logger.log('[GUARD] roleGuard — access granted for role', auth.currentRole());
    return true;
  };

  logger.log('[GUARD] roleGuard —', allowedRoles, '— isLoading:', auth.isLoading());

  // Fast path: auth has already resolved.
  if (!auth.isLoading()) return decide();

  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    timeout({ first: GUARD_TIMEOUT }),
    map(decide),
    catchError(err => {
      logger.error('[GUARD] roleGuard timed out or errored — redirecting to login:', err);
      return of(router.createUrlTree([loginUrl]));
    }),
  );
};
