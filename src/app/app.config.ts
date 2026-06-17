import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling }                  from '@angular/router';
import { provideClientHydration, withEventReplay }               from '@angular/platform-browser';
import { provideHttpClient, withFetch }                          from '@angular/common/http';

import { routes } from './app.routes';
import { GlobalErrorHandlerService } from './core/services/error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),   /* required by PopupService to load popup-config.json */
  ]
};
