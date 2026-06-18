import { inject }                    from '@angular/core';
import { CanActivateFn, Router }     from '@angular/router';
import { toObservable }              from '@angular/core/rxjs-interop';
import { filter, map, take }         from 'rxjs/operators';
import { AdminAuthService }          from '../services/admin-auth.service';
import { APP_ROUTES }                from '../../../core/constants/routes.constants';

export const adminAuthGuard: CanActivateFn = () => {
  const auth   = inject(AdminAuthService);
  const router = inject(Router);
  const login  = `/${APP_ROUTES.ADMIN}/login`;

  if (!auth.isLoading()) {
    return auth.isAdmin() ? true : router.createUrlTree([login]);
  }

  return toObservable(auth.isLoading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => auth.isAdmin() ? true : router.createUrlTree([login])),
  );
};
