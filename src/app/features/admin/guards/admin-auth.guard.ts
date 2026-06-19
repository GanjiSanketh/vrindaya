import { inject }                                from '@angular/core';
import { CanActivateFn, Router }                  from '@angular/router';
import { toObservable }                           from '@angular/core/rxjs-interop';
import { filter, map, take, timeout, catchError } from 'rxjs/operators';
import { of }                                     from 'rxjs';
import { AdminAuthService }                       from '../services/admin-auth.service';
import { APP_ROUTES }                             from '../../../core/constants/routes.constants';

/** Safety net: if isLoading somehow never resolves, redirect to login after this many ms. */
const GUARD_TIMEOUT_MS = 15_000;

export const adminAuthGuard: CanActivateFn = () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);
  const login  = `/${APP_ROUTES.ADMIN}/login`;

  // Fast path: Firebase has already resolved auth state.
  if (!auth.isLoading()) {
    const allow = auth.isAdmin();
    console.log('[GUARD] adminAuthGuard — immediate decision:', allow ? 'allow' : 'redirect to login');
    return allow ? true : router.createUrlTree([login]);
  }

  // Auth is still initialising — wait for the signal to settle.
  console.log('[GUARD] adminAuthGuard — waiting for auth to resolve');

  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    timeout({ first: GUARD_TIMEOUT_MS }),
    map(() => {
      const allow = auth.isAdmin();
      console.log('[GUARD] adminAuthGuard — resolved:', allow ? 'allow' : 'redirect to login');
      return allow ? true : router.createUrlTree([login]);
    }),
    catchError(err => {
      console.error('[GUARD] adminAuthGuard timed out:', err);
      return of(router.createUrlTree([login]));
    }),
  );
};
