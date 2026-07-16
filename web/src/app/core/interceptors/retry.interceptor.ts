import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Retries transient failures on public GET requests to the API (network
 * blips, cold-start latency) with a short linear backoff. Deliberately
 * GET-only — mutations (POST/PUT/PATCH/DELETE) must never be retried
 * automatically, since they aren't guaranteed idempotent.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(
    retry({ count: 2, delay: (_error, retryCount) => timer(retryCount * 600) }),
  );
};
