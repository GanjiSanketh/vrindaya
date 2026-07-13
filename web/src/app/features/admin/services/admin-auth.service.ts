import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';
import { environment }                              from '../../../../environments/environment';
import { AdminRole }                                from '../models/admin-user.model';

export interface AdminUser {
  uid:         string;
  email:       string | null;
  displayName: string | null;
  photoURL:    string | null;
  role:        AdminRole;
  docId:       string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly pid        = inject(PLATFORM_ID);
  private readonly ADMIN_EMAIL = 'gsanketh7121@gmail.com';

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

  // ── Firebase helpers ──────────────────────────────────────────────────────

  private async getApp() {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    return getApps().length ? getApp() : initializeApp(environment.firebase);
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Registers the onAuthStateChanged listener.
   *
   * Authorization is a synchronous email comparison — no network calls after
   * Firebase Auth resolves.  The try/catch/finally in the callback guarantees
   * isLoading is always set to false regardless of what happens.
   */
  private async initFirebaseAuth(): Promise<void> {
    console.log('[AUTH] Service started');

    try {
      const app = await this.getApp();
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth(app);

      console.log('[AUTH] Firebase Initialized');

      onAuthStateChanged(auth, async fbUser => {
        try {
          console.log('[AUTH] Auth State Changed —', fbUser ? `user: ${fbUser.email}` : 'no user');

          if (fbUser) {
            const isAuthorized =
              fbUser.email?.toLowerCase() === this.ADMIN_EMAIL.toLowerCase();

            if (isAuthorized) {
              console.log('[AUTH] Authorized Admin —', fbUser.email);
              this.authError.set(null);
              this.currentUser.set({
                uid:         fbUser.uid,
                email:       fbUser.email,
                displayName: fbUser.displayName,
                photoURL:    fbUser.photoURL,
                role:        'super_admin',
                docId:       fbUser.uid,
              });
              console.log('[AUTH] Redirecting to Dashboard');
            } else {
              console.warn('[AUTH] Unauthorized User —', fbUser.email);
              this.currentUser.set(null);
              this.authError.set(
                'You are not authorized to access the Vrindaya Admin Portal.',
              );
              // Fire-and-forget sign-out — NOT awaited so it never blocks isLoading.
              import('firebase/auth')
                .then(({ signOut }) => signOut(auth))
                .catch(e => console.warn('[AUTH] Background signOut failed:', e));
            }
          } else {
            this.currentUser.set(null);
          }

        } catch (err) {
          console.error('[AUTH] Auth callback error:', err);
          this.currentUser.set(null);
          this.authError.set('Authentication error. Please try again.');

        } finally {
          // Always runs — isLoading can never stay true forever.
          console.log('[AUTH] Loading complete — isLoading → false');
          this.isLoading.set(false);
        }
      });

    } catch (err) {
      console.error('[AUTH] Firebase initialization failed:', err);
      this.authError.set('Authentication service unavailable. Please refresh the page.');
      this.isLoading.set(false);
    }
  }

  // ── Role helpers ──────────────────────────────────────────────────────────

  isAdmin():         boolean          { return !this.isLoading() && this.currentUser() !== null; }
  isAuthenticated(): boolean          { return this.isAdmin(); }
  isSuperAdmin():    boolean          { return this.currentUser() !== null; }
  isAdminRole():     boolean          { return false; }
  isEditor():        boolean          { return false; }
  currentRole():     AdminRole | null { return this.currentUser() ? 'super_admin' : null; }

  /** The single admin is always super_admin — allow any route that lists super_admin. */
  hasRole(roles: AdminRole[]): boolean {
    return this.currentUser() !== null && roles.includes('super_admin');
  }

  // ── Auth actions ──────────────────────────────────────────────────────────

  async signIn(): Promise<void> {
    this.authError.set(null);
    if (!isPlatformBrowser(this.pid)) return;

    this.isLoading.set(true);
    console.log('[AUTH] Login initiated');

    try {
      const app = await this.getApp();
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const auth     = getAuth(app);
      const provider = new GoogleAuthProvider();

      console.log('[AUTH] Opening Google Sign-In popup');
      await signInWithPopup(auth, provider);
      // onAuthStateChanged callback handles the email check and currentUser update.
      console.log('[AUTH] Login Success — awaiting auth state callback');

    } catch (err: unknown) {
      this.isLoading.set(false);
      const code = (err as { code?: string }).code;
      console.warn('[AUTH] signIn error —', code);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/popup-blocked') {
        this.authError.set('Pop-up was blocked. Allow pop-ups for this site and try again.');
        return;
      }
      if (code === 'auth/network-request-failed') {
        this.authError.set('Network error. Check your connection and try again.');
        return;
      }
      this.authError.set('Sign-in failed. Please try again.');
    }
  }

  async signOut(): Promise<void> {
    if (!isPlatformBrowser(this.pid)) return;
    console.log('[AUTH] Signing out');
    try {
      const { getApps, getApp }  = await import('firebase/app');
      const { getAuth, signOut } = await import('firebase/auth');
      if (getApps().length) await signOut(getAuth(getApp()));
    } catch (e) {
      console.warn('[AUTH] signOut error (non-fatal):', e);
    }
    this.currentUser.set(null);
  }
}
