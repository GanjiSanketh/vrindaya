import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';
import { environment }                              from '../../../../environments/environment';

export interface AdminUser {
  uid:         string;
  email:       string | null;
  displayName: string | null;
  photoURL:    string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly pid = inject(PLATFORM_ID);

  readonly currentUser = signal<AdminUser | null>(null);
  readonly isLoading   = signal(true);
  readonly authError   = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.pid)) {
      this.initFirebaseAuth();
    } else {
      this.isLoading.set(false);
    }
  }

  private async initFirebaseAuth(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getAuth, onAuthStateChanged }    = await import('firebase/auth');

      const app  = getApps().length ? getApp() : initializeApp(environment.firebase);
      const auth = getAuth(app);

      onAuthStateChanged(auth, user => {
        if (user && user.email === environment.adminEmail) {
          this.currentUser.set({
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName,
            photoURL:    user.photoURL,
          });
        } else {
          this.currentUser.set(null);
        }
        this.isLoading.set(false);
      });
    } catch {
      this.isLoading.set(false);
    }
  }

  /** True once Firebase has resolved and the user is the authorised admin. */
  isAdmin(): boolean         { return !this.isLoading() && this.currentUser() !== null; }

  /** Alias for isAdmin() — satisfies the isAuthenticated() contract. */
  isAuthenticated(): boolean { return this.isAdmin(); }

  /** Sign in via Google popup. Rejects silently on popup-cancel; sets authError on all other failures. */
  async signIn(): Promise<void> {
    this.authError.set(null);
    if (!isPlatformBrowser(this.pid)) return;

    try {
      const { getApps, getApp, initializeApp }               = await import('firebase/app');
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

      const app      = getApps().length ? getApp() : initializeApp(environment.firebase);
      const auth     = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: environment.adminEmail });

      const result = await signInWithPopup(auth, provider);

      if (result.user.email !== environment.adminEmail) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        this.authError.set(
          'Unauthorized account. Only the designated admin email may access this portal.',
        );
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;

      if (code === 'auth/popup-blocked') {
        this.authError.set(
          'Pop-up was blocked by your browser. Allow pop-ups for this site and try again.',
        );
        return;
      }

      if (code === 'auth/network-request-failed') {
        this.authError.set('Network error. Please check your internet connection and try again.');
        return;
      }

      this.authError.set('Sign-in failed. Please try again.');
    }
  }

  async signOut(): Promise<void> {
    if (!isPlatformBrowser(this.pid)) return;
    try {
      const { getApps, getApp }  = await import('firebase/app');
      const { getAuth, signOut } = await import('firebase/auth');
      if (getApps().length) {
        await signOut(getAuth(getApp()));
      }
    } catch { /* ignore */ }
    this.currentUser.set(null);
  }
}
