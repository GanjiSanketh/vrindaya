import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';

/**
 * Attaches the app's own AppJwt (see JwtTokenService on the backend, minted
 * by POST /auth/login) as a Bearer header on every other request to the API.
 * Skips requests that already carry an explicit Authorization header — the
 * one case is AdminAuthService's own login call, which must send the
 * Firebase ID token instead (there's no AppJwt yet at that point).
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl) || req.headers.has('Authorization')) {
    return next(req);
  }

  const tokenStorage = inject(AuthTokenStorageService);
  const session = tokenStorage.getSession();

  return next(session ? req.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } }) : req);
};
