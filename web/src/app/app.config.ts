import { ApplicationConfig, ErrorHandler, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions, withPreloading, PreloadAllModules } from '@angular/router';
import { provideClientHydration, withEventReplay }               from '@angular/platform-browser';
import { provideAnimationsAsync }                                from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors }        from '@angular/common/http';
import { provideServiceWorker }                                  from '@angular/service-worker';

import { routes } from './app.routes';
import { GlobalErrorHandlerService } from './core/services/error-handler.service';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),         /* lazy-loaded animation engine — keeps it out of the main bundle */
    provideHttpClient(withFetch(), withInterceptors([authErrorInterceptor, authTokenInterceptor, retryInterceptor, timeoutInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
};
