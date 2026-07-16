import { Injectable, inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Answers "what's the current Firebase ID token, if any" for the HttpClient
 * interceptor that talks to the ASP.NET Core API. Deliberately separate from
 * AdminAuthService (features/admin — enforces the admin-email allowlist and
 * redirects on unauthorized users, which is UI/routing policy, not token
 * plumbing) so core/interceptors never depends on a feature module, matching
 * how ProductQueryService/CategoryService already stay feature-agnostic.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseTokenService {
  private readonly pid = inject(PLATFORM_ID);
  private ready: Promise<void>;
  private currentUser: import('firebase/auth').User | null = null;

  constructor() {
    this.ready = isPlatformBrowser(this.pid) ? this.initAuthListener() : Promise.resolve();
  }

  private initAuthListener(): Promise<void> {
    return new Promise(resolve => {
      this.setUpListener(resolve).catch(err => {
        if (isDevMode()) console.error('[FirebaseTokenService] init failed:', err);
        resolve();
      });
    });
  }

  private async setUpListener(onFirstEmission: () => void): Promise<void> {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    const auth = getAuth(app);

    let firstEmission = true;
    onAuthStateChanged(auth, user => {
      this.currentUser = user;
      if (firstEmission) {
        firstEmission = false;
        onFirstEmission();
      }
    });
  }

  /** Resolves to null if nobody is signed in — the interceptor sends the request without a Bearer header in that case. */
  async getIdToken(): Promise<string | null> {
    await this.ready;
    if (!this.currentUser) return null;
    return this.currentUser.getIdToken();
  }
}
