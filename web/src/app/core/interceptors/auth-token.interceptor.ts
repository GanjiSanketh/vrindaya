import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirebaseTokenService } from '../services/firebase-token.service';

/**
 * Attaches the signed-in admin's Firebase ID token as a Bearer header on
 * every request to the ASP.NET Core API — the same token Angular already
 * obtains from its existing Google Sign-In flow (AdminAuthService), just
 * forwarded here instead of a new login system. Gated on the API's base
 * URL so it never touches the one unrelated existing HttpClient call
 * (PopupService's static JSON fetch) or any Firebase SDK calls (those
 * aren't HttpClient requests at all).
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const tokenService = inject(FirebaseTokenService);

  return from(tokenService.getIdToken()).pipe(
    switchMap(token =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
