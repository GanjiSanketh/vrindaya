import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * 30s ceiling on every API call — generous enough to ride out Render
 * free-tier cold starts, but still guarantees a request eventually fails
 * instead of hanging indefinitely. Surfaces as a TimeoutError, which every
 * caller's existing catchError/try-catch already treats like any other
 * failed HttpClient request (no caller special-cases HTTP status codes for
 * this to bypass).
 */
const API_TIMEOUT_MS = 30_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(timeout(API_TIMEOUT_MS));
};
