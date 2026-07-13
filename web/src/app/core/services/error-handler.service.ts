import { ErrorHandler, Injectable, isDevMode } from '@angular/core';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  handleError(error: unknown): void {
    if (isDevMode()) {
      console.error('[GlobalErrorHandler]', error);
    }
  }
}
