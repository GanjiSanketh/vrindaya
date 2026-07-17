import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../features/admin/services/admin-auth.service';

/**
 * Catches a 401 from the API on any admin request and forces an immediate
 * sign-out — AdminAuthService's own cross-tab-logout effect (watching
 * currentUser transition to null) then handles clearing cached admin data
 * and redirecting to /admin/login, so this interceptor doesn't duplicate
 * that logic, just triggers it.
 *
 * Registered before authTokenInterceptor/retryInterceptor in app.config.ts's
 * interceptor array, which makes it the OUTERMOST wrapper — it only sees a
 * 401 after retryInterceptor has already given up retrying, not an
 * intermediate one that gets retried away.
 *
 * Gated on `auth.currentUser()` being non-null: a 401 can only originate
 * from an admin-only endpoint (every public storefront endpoint allows
 * anonymous callers), so if nobody's currently signed in as admin there's
 * no session to expire and nothing to do — this also means a customer
 * browsing the public storefront is never affected by this interceptor.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const auth = inject(AdminAuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && auth.currentUser() !== null) {
        auth.authError.set('Your session has expired. Please login again.');
        void auth.signOut();
      }
      return throwError(() => err);
    }),
  );
};
