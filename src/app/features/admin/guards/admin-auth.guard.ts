import { inject }                                    from '@angular/core';
import { CanActivateFn, Router }                      from '@angular/router';
import { toObservable }                               from '@angular/core/rxjs-interop';
import { filter, map, take, timeout, catchError }     from 'rxjs/operators';
import { of }                                         from 'rxjs';
import { AdminAuthService }                           from '../services/admin-auth.service';
import { APP_ROUTES }                                 from '../../../core/constants/routes.constants';

/** Maximum ms to wait for auth to resolve before falling back to login. */
const GUARD_TIMEOUT = 20_000;

export const adminAuthGuard: CanActivateFn = () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);
  const login  = `/${APP_ROUTES.ADMIN}/login`;

  console.log('[GUARD] adminAuthGuard — isLoading:', auth.isLoading(), '/ isAdmin:', auth.isAdmin());

  // Fast path: auth has already resolved, decide immediately.
  if (!auth.isLoading()) {
    const allow = auth.isAdmin();
    console.log('[GUARD] Immediate decision —', allow ? 'allow' : 'redirect to login');
    return allow ? true : router.createUrlTree([login]);
  }

  // Auth is still loading — wait for the signal to emit false.
  // timeout() provides a safety net: if the service somehow never resolves
  // (e.g. a future regression), the guard redirects to login instead of
  // blocking navigation indefinitely.
  console.log('[GUARD] Waiting for auth to resolve (timeout:', GUARD_TIMEOUT, 'ms)');

  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    timeout({ first: GUARD_TIMEOUT }),
    map(() => {
      const allow = auth.isAdmin();
      console.log('[GUARD] Auth resolved — isAdmin:', allow);
      return allow ? true : router.createUrlTree([login]);
    }),
    catchError(err => {
      console.error('[GUARD] adminAuthGuard timed out or errored — redirecting to login:', err);
      return of(router.createUrlTree([login]));
    }),
  );
};
