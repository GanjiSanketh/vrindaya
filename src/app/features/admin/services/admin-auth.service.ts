import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';
import { environment }                              from '../../../../environments/environment';
import { AdminRole }                                from '../models/admin-user.model';

/** The shape held in the currentUser signal. */
export interface AdminUser {
  uid:         string;
  email:       string | null;
  displayName: string | null;
  photoURL:    string | null;
  role:        AdminRole;
  /** Firestore document ID — used by AdminUsersService for updates. */
  docId:       string;
}

const COLLECTION = 'admin-users';

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

  // ── Firebase helpers ──────────────────────────────────────────────────────

  private async getApp() {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    return getApps().length ? getApp() : initializeApp(environment.firebase);
  }

  /**
   * Sets up the persistent onAuthStateChanged listener.
   * On every auth state change it runs the Firestore lookup and
   * signs out + sets authError if the user is not an active admin.
   */
  private async initFirebaseAuth(): Promise<void> {
    try {
      const app = await this.getApp();
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth(app);

      onAuthStateChanged(auth, async fbUser => {
        if (fbUser) {
          const adminUser = await this.resolveFromFirestore(
            app,
            fbUser.uid,
            fbUser.email        ?? '',
            fbUser.displayName  ?? '',
            fbUser.photoURL,
          );

          if (!adminUser) {
            const { signOut } = await import('firebase/auth');
            await signOut(auth);
            this.authError.set(
              'You are not authorized to access the Vrindaya Admin Portal.',
            );
          }
          this.currentUser.set(adminUser);
        } else {
          this.currentUser.set(null);
        }
        this.isLoading.set(false);
      });
    } catch {
      this.isLoading.set(false);
    }
  }

  /**
   * Looks up the signed-in Firebase user in the admin-users Firestore collection.
   *
   * Flow:
   *  1. Query by email — if found and active, return the admin user.
   *  2. If the collection is EMPTY and the email matches environment.adminEmail,
   *     bootstrap the super_admin document (first-run initialization).
   *  3. Otherwise return null (unauthorized).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resolveFromFirestore(
    app:         unknown,
    uid:         string,
    email:       string,
    displayName: string,
    photoURL:    string | null,
  ): Promise<AdminUser | null> {
    try {
      const {
        getFirestore, collection, query, where, getDocs,
        addDoc, updateDoc, doc, serverTimestamp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = await import('firebase/firestore');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db         = getFirestore(app as any);
      const col        = collection(db, COLLECTION);
      const lowerEmail = email.toLowerCase();

      // 1. Look up by email
      const emailSnap = await getDocs(query(col, where('email', '==', lowerEmail)));

      if (!emailSnap.empty) {
        const snap = emailSnap.docs[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = snap.data() as Record<string, any>;

        if (!data['active']) return null; // Account deactivated

        // Sync uid / displayName on first login or profile change
        const patch: Record<string, unknown> = {};
        if (!data['uid'] || data['uid'] !== uid) patch['uid'] = uid;
        if (displayName && data['displayName'] !== displayName) patch['displayName'] = displayName;
        if (Object.keys(patch).length) {
          await updateDoc(doc(db, COLLECTION, snap.id), patch);
        }

        return {
          uid,
          email,
          photoURL,
          displayName: displayName || (data['displayName'] as string) || '',
          role:        data['role'] as AdminRole,
          docId:       snap.id,
        };
      }

      // 2. Collection empty → bootstrap super_admin from environment config
      const allSnap = await getDocs(col);
      if (allSnap.empty && lowerEmail === environment.adminEmail.toLowerCase()) {
        const ref = await addDoc(col, {
          uid,
          email:       lowerEmail,
          displayName: displayName || '',
          role:        'super_admin' as AdminRole,
          active:      true,
          createdAt:   serverTimestamp(),
          createdBy:   'system',
        });
        return {
          uid,
          email,
          photoURL,
          displayName: displayName || '',
          role:        'super_admin',
          docId:       ref.id,
        };
      }

      return null; // Not found in admin-users collection
    } catch {
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

    try {
      const app = await this.getApp();
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const auth     = getAuth(app);
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);
      // onAuthStateChanged (in initFirebaseAuth) handles Firestore lookup + currentUser update.

    } catch (err: unknown) {
      this.isLoading.set(false);
      const code = (err as { code?: string }).code;

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
    try {
      const { getApps, getApp }  = await import('firebase/app');
      const { getAuth, signOut } = await import('firebase/auth');
      if (getApps().length) await signOut(getAuth(getApp()));
    } catch { /* ignore */ }
    this.currentUser.set(null);
  }
}
