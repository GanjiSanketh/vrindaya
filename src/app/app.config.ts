import { ApplicationConfig, ErrorHandler, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay }               from '@angular/platform-browser';
import { provideAnimationsAsync }                                from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch }                          from '@angular/common/http';
import { provideServiceWorker }                                  from '@angular/service-worker';

import { routes } from './app.routes';
import { GlobalErrorHandlerService } from './core/services/error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),         /* lazy-loaded animation engine — keeps it out of the main bundle */
    provideHttpClient(withFetch()),   /* required by PopupService to load popup-config.json */
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
};
