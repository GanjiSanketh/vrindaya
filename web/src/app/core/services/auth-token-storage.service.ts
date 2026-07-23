import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';

export interface StoredAdminUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

export interface AdminSession {
  token:     string;
  expiresAt: string; // ISO 8601, from LoginResponse.ExpiresAt
  user:      StoredAdminUser;
}

const STORAGE_KEY = 'vrindaya_admin_session';

/**
 * The one place the AppJwt (see JwtTokenService on the backend) touches
 * localStorage — kept separate from AdminAuthService so authTokenInterceptor
 * (core/, must stay feature-agnostic) can read the token without depending
 * on features/admin. Also the source of cross-tab logout/login sync: every
 * write/removal here fires the browser's native `storage` event in every
 * OTHER open tab (never the tab that made the change), which AdminAuthService
 * listens for.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStorageService {
  private readonly pid = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.pid);

  private readonly externalChange$ = new Subject<AdminSession | null>();

  constructor() {
    if (this.browser) {
      window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY) return;
        this.externalChange$.next(this.parse(event.newValue));
      });
    }
  }

  /** Emits whenever another tab changes the session (login/logout there) — never fires for changes made in this tab. */
  get changedInAnotherTab$(): Observable<AdminSession | null> {
    return this.externalChange$.asObservable();
  }

  getSession(): AdminSession | null {
    if (!this.browser) return null;
    const session = this.parse(localStorage.getItem(STORAGE_KEY));
    if (session && this.isExpired(session)) {
      this.clearSession();
      return null;
    }
    return session;
  }

  setSession(session: AdminSession): void {
    if (!this.browser) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    if (!this.browser) return;
    localStorage.removeItem(STORAGE_KEY);
  }

  isExpired(session: AdminSession): boolean {
    return Date.parse(session.expiresAt) <= Date.now();
  }

  private parse(raw: string | null): AdminSession | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      return null;
    }
  }
}
