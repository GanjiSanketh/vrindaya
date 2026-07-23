import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoggerService } from '../../../core/services/logger.service';
import { APP_ROUTES } from '../../../core/constants/routes.constants';
import { ProductApiService } from '../../../core/services/product-api.service';
import { AuthTokenStorageService, AdminSession } from '../../../core/services/auth-token-storage.service';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  photoURL: string | null;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { id: string; name: string; email: string; role: string };
}

const LOGIN_URL = `${environment.apiBaseUrl}/auth/login`;

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly pid = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly productApi = inject(ProductApiService);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  readonly currentUser = signal<AdminUser | null>(null);
  readonly isLoading = signal(true);
  readonly authError = signal<string | null>(null);

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (isPlatformBrowser(this.pid)) {
      this.restoreSession();
      void this.initFirebaseBackground();
      this.tokenStorage.changedInAnotherTab$.subscribe(session => this.onExternalSessionChange(session));
    } else {
      this.isLoading.set(false);
    }
  }

  private restoreSession(): void {
    const session = this.tokenStorage.getSession();
    if (session) {
      this.logger.log('[AUTH] Restored session from storage —', session.user.email);
      this.applySession(session, null);
    }
    this.isLoading.set(false);
  }

  private applySession(session: AdminSession, photoURL: string | null): void {
    this.currentUser.set({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      photoURL,
    });
    this.scheduleExpiryLogout(session.expiresAt);
  }

  private scheduleExpiryLogout(expiresAt: string): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    const ms = Date.parse(expiresAt) - Date.now();
    if (ms <= 0) { void this.handleExpiry(); return; }
    this.expiryTimer = setTimeout(() => void this.handleExpiry(), ms);
  }

  private async handleExpiry(): Promise<void> {
    this.logger.log('[AUTH] Session expired');
    this.authError.set('Your session has expired. Please login again.');
    await this.signOut();
  }

  private onExternalSessionChange(session: AdminSession | null): void {
    if (session) {
      this.logger.log('[AUTH] Session started in another tab — syncing');
      this.applySession(session, this.currentUser()?.photoURL ?? null);
    } else {
      this.logger.log('[AUTH] Signed out in another tab — syncing');
      if (this.expiryTimer) clearTimeout(this.expiryTimer);
      this.currentUser.set(null);
      this.productApi.clearCache();
      void this.router.navigate([`/${APP_ROUTES.ADMIN}/login`]);
    }
  }

  private async getApp() {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    return getApps().length ? getApp() : initializeApp(environment.firebase);
  }

  private async initFirebaseBackground(): Promise<void> {
    try {
      const app = await this.getApp();
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth(app);
      onAuthStateChanged(auth, fbUser => {
        if (fbUser?.photoURL && this.currentUser()) {
          this.currentUser.update(u => (u ? { ...u, photoURL: fbUser.photoURL } : u));
        }
      });
    } catch (err) {
      this.logger.warn('[AUTH] Firebase background init failed:', err);
    }
  }

  private async signOutOfFirebaseOnly(): Promise<void> {
    if (!isPlatformBrowser(this.pid)) return;
    try {
      const { getApps, getApp } = await import('firebase/app');
      const { getAuth, signOut } = await import('firebase/auth');
      if (getApps().length) await signOut(getAuth(getApp()));
    } catch (e) {
      this.logger.warn('[AUTH] Firebase signOut error (non-fatal):', e);
    }
  }

  isAdmin(): boolean { return !this.isLoading() && this.currentUser() !== null; }
  isAuthenticated(): boolean { return this.isAdmin(); }
  currentRole(): string | null { return this.currentUser()?.role ?? null; }

  hasRole(roles: string[]): boolean {
    const role = this.currentUser()?.role;
    return role !== undefined && role !== null && roles.includes(role);
  }

  async signIn(): Promise<void> {
    this.authError.set(null);
    if (!isPlatformBrowser(this.pid)) return;
    this.isLoading.set(true);
    let photoURL: string | null = null;

    try {
      const app = await this.getApp();
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const credential = await signInWithPopup(auth, provider);
      photoURL = credential.user.photoURL;
      const idToken = await credential.user.getIdToken();

      const response = await firstValueFrom(
        this.http.post<LoginResponse>(LOGIN_URL, {}, { headers: { Authorization: `Bearer ${idToken}` } }),
      );

      const session: AdminSession = { token: response.token, expiresAt: response.expiresAt, user: response.user };
      this.tokenStorage.setSession(session);
      this.applySession(session, photoURL);
      this.authError.set(null);
      this.logger.log('[AUTH] Login success —', response.user.email, response.user.role);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        this.logger.warn('[AUTH] Backend rejected login:', err.status);
        this.authError.set(
          typeof err.error?.message === 'string'
            ? err.error.message
            : 'You are not authorized to access the Vrindaya Admin Portal.',
        );
        await this.signOutOfFirebaseOnly();
      } else {
        const code = (err as { code?: string }).code;
        this.logger.warn('[AUTH] signIn error —', code);
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          // user-initiated cancel
        } else if (code === 'auth/popup-blocked') {
          this.authError.set('Pop-up was blocked. Allow pop-ups for this site and try again.');
        } else if (code === 'auth/network-request-failed') {
          this.authError.set('Network error. Check your connection and try again.');
        } else {
          this.authError.set('Sign-in failed. Please try again.');
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut(): Promise<void> {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.tokenStorage.clearSession();
    this.currentUser.set(null);
    this.productApi.clearCache();
    await this.signOutOfFirebaseOnly();
    if (isPlatformBrowser(this.pid)) {
      void this.router.navigate([`/${APP_ROUTES.ADMIN}/login`]);
    }
  }
}
