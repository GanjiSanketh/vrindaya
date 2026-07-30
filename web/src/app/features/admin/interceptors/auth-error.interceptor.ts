import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminAuthService } from '../services/admin-auth.service';

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
