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

const COLLECTION = 'admin-users';
const FS_MS      = 10_000;   // Firestore per-operation timeout
const SETUP_MS   = 10_000;   // Firebase SDK init timeout

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

  // ── Timeout helper ────────────────────────────────────────────────────────

  /**
   * Returns a Promise<never> that rejects after `ms` milliseconds.
   * Use with Promise.race() to add a hard deadline to any async operation.
   */
  private wait(ms: number): Promise<never> {
    return new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[AUTH] timed out after ${ms}ms`)), ms)
    );
  }

  // ── Firebase helpers ──────────────────────────────────────────────────────

  private async getApp() {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    return getApps().length ? getApp() : initializeApp(environment.firebase);
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Registers the onAuthStateChanged listener that drives all auth state.
   *
   * CRITICAL: the listener callback is async-void. Any unhandled rejection
   * inside it silently prevents isLoading from ever being set to false,
   * which is the root cause of the "Checking authentication…" deadlock.
   *
   * Fix: the callback body is wrapped in try/catch/finally.
   * The finally block unconditionally calls isLoading.set(false),
   * so the UI always resolves — regardless of success, error, or timeout.
   */
  private async initFirebaseAuth(): Promise<void> {
    console.log('[AUTH] Service started');

    try {
      const app = await Promise.race([this.getApp(), this.wait(SETUP_MS)]);
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth(app);

      console.log('[AUTH] Firebase initialized — registering auth listener');

      onAuthStateChanged(auth, async fbUser => {
        // ── CRITICAL: try/catch/finally around the entire async body ─────────
        // Without this, any unhandled rejection (signOut(), Firestore, dynamic
        // import) prevents the finally block from running, leaving isLoading
        // stuck at true forever.
        try {
          console.log('[AUTH] Auth state changed —', fbUser ? `user: ${fbUser.email}` : 'no user');

          if (fbUser) {
            console.log('[AUTH] Resolving admin access for', fbUser.email);
            const adminUser = await this.resolveFromFirestore(
              app,
              fbUser.uid,
              fbUser.email       ?? '',
              fbUser.displayName ?? '',
              fbUser.photoURL,
            );

            if (adminUser) {
              console.log('[AUTH] Access granted — role:', adminUser.role);
              this.currentUser.set(adminUser);
            } else {
              console.warn('[AUTH] User not in admin-users — clearing session');
              this.currentUser.set(null);
              this.authError.set(
                'You are not authorized to access the Vrindaya Admin Portal.',
              );
              // Fire-and-forget: clear the persisted Firebase session.
              // NOT awaited — avoids a signOut() failure blocking isLoading.set(false).
              import('firebase/auth')
                .then(({ signOut }) => signOut(auth))
                .catch(e => console.warn('[AUTH] Background signOut failed (non-fatal):', e));
            }
          } else {
            this.currentUser.set(null);
          }

        } catch (callbackErr) {
          // Catches anything that escaped from resolveFromFirestore or signal writes.
          console.error('[AUTH] Unexpected error in auth state callback:', callbackErr);
          this.currentUser.set(null);
          this.authError.set('Unable to verify admin access. Please try again.');

        } finally {
          // ── ALWAYS runs — this is the guarantee that isLoading never stays true.
          console.log('[AUTH] Loading complete — isLoading → false');
          this.isLoading.set(false);
        }
      });

    } catch (initErr) {
      // Catches failures in SDK import or getApp() (e.g. chunk load error, timeout).
      console.error('[AUTH] Firebase initialization failed:', initErr);
      this.authError.set(
        'Authentication service unavailable. Please refresh the page.',
      );
      this.isLoading.set(false);
    }
  }

  // ── Firestore admin lookup ────────────────────────────────────────────────

  /**
   * Queries admin-users by email.
   * Every Firestore operation is wrapped in Promise.race() with a hard timeout
   * so a stalled network connection can never hang this method indefinitely.
   *
   * Returns null on any error — the caller's finally block still runs.
   */
  private async resolveFromFirestore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app:         any,
    uid:         string,
    email:       string,
    displayName: string,
    photoURL:    string | null,
  ): Promise<AdminUser | null> {
    console.log('[AUTH] Firestore query started for', email);

    try {
      const {
        getFirestore, collection, query, where, getDocs,
        addDoc, updateDoc, doc, serverTimestamp,
      } = await import('firebase/firestore');

      const db         = getFirestore(app);
      const col        = collection(db, COLLECTION);
      const lowerEmail = email.toLowerCase();

      // 1. Look up by email (hard timeout prevents indefinite hang)
      console.log('[AUTH] Querying admin-users collection');
      const emailSnap = await Promise.race([
        getDocs(query(col, where('email', '==', lowerEmail))),
        this.wait(FS_MS),
      ]);
      console.log('[AUTH] Query complete —', emailSnap.size, 'doc(s) found');

      if (!emailSnap.empty) {
        const snap = emailSnap.docs[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = snap.data() as Record<string, any>;

        if (!data['active']) {
          console.warn('[AUTH] Account is deactivated');
          return null;
        }

        // Sync uid/displayName on first login — fire-and-forget, never blocks auth.
        const patch: Record<string, unknown> = {};
        if (!data['uid'] || data['uid'] !== uid)                 patch['uid'] = uid;
        if (displayName && data['displayName'] !== displayName)  patch['displayName'] = displayName;
        if (Object.keys(patch).length) {
          Promise.race([
            updateDoc(doc(db, COLLECTION, snap.id), patch),
            this.wait(5_000),
          ]).catch(e => console.warn('[AUTH] updateDoc failed (non-fatal):', e));
        }

        return {
          uid, email, photoURL,
          displayName: displayName || (data['displayName'] as string) || '',
          role:        data['role'] as AdminRole,
          docId:       snap.id,
        };
      }

      // 2. Collection empty → bootstrap super_admin from environment config
      console.log('[AUTH] Email not found — checking if bootstrap required');
      const allSnap = await Promise.race([getDocs(col), this.wait(FS_MS)]);

      if (allSnap.empty && lowerEmail === environment.adminEmail.toLowerCase()) {
        console.log('[AUTH] Bootstrapping first super_admin');
        const ref = await Promise.race([
          addDoc(col, {
            uid,
            email:       lowerEmail,
            displayName: displayName || '',
            role:        'super_admin' as AdminRole,
            active:      true,
            createdAt:   serverTimestamp(),
            createdBy:   'system',
          }),
          this.wait(FS_MS),
        ]);
        console.log('[AUTH] super_admin bootstrapped — docId:', ref.id);
        return { uid, email, photoURL, displayName: displayName || '', role: 'super_admin', docId: ref.id };
      }

      console.log('[AUTH] User not found in admin-users');
      return null;

    } catch (err) {
      // Catches permission-denied, network error, timeout, or any other Firestore failure.
      console.error('[AUTH] Firestore error:', err);
      this.authError.set(
        'Unable to verify admin access. Please check your connection and try again.',
      );
      return null;
    }
  }

  // ── Role helpers ──────────────────────────────────────────────────────────

  isAdmin():         boolean          { return !this.isLoading() && this.currentUser() !== null; }
  isAuthenticated(): boolean          { return this.isAdmin(); }
  isSuperAdmin():    boolean          { return this.currentUser()?.role === 'super_admin'; }
  isAdminRole():     boolean          { return this.currentUser()?.role === 'admin'; }
  isEditor():        boolean          { return this.currentUser()?.role === 'editor'; }
  currentRole():     AdminRole | null { return this.currentUser()?.role ?? null; }

  hasRole(roles: AdminRole[]): boolean {
    const r = this.currentUser()?.role;
    return r ? roles.includes(r) : false;
  }

  // ── Auth actions ──────────────────────────────────────────────────────────

  async signIn(): Promise<void> {
    this.authError.set(null);
    if (!isPlatformBrowser(this.pid)) return;

    this.isLoading.set(true);
    console.log('[AUTH] signIn initiated');

    try {
      const app = await this.getApp();
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const auth     = getAuth(app);
      const provider = new GoogleAuthProvider();

      console.log('[AUTH] Opening Google Sign-In popup');
      await signInWithPopup(auth, provider);
      // onAuthStateChanged callback handles Firestore lookup + currentUser update.
      console.log('[AUTH] signInWithPopup complete — awaiting auth state callback');

    } catch (err: unknown) {
      this.isLoading.set(false);
      const code = (err as { code?: string }).code;
      console.warn('[AUTH] signIn error —', code, err);

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
      if (getApps().length) {
        await Promise.race([signOut(getAuth(getApp())), this.wait(5_000)]);
      }
    } catch (e) {
      console.warn('[AUTH] signOut error (non-fatal):', e);
    }
    this.currentUser.set(null);
  }
}
