import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';
import { environment }                              from '../../../../environments/environment';
import { AdminUser, AdminRole }                     from '../models/admin-user.model';

/**
 * Document schema: admin-users/{lowerCaseEmail}
 *
 * The document ID is always the user's lowercase email address.
 * This allows O(1) direct reads (getDoc) instead of collection queries (getDocs),
 * which is important because Firestore security rules may grant 'get' but not 'list'.
 */
const COLLECTION = 'admin-users';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly pid = inject(PLATFORM_ID);

  readonly users   = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  private unsub: (() => void) | null = null;

  // ── Real-time listener ────────────────────────────────────────────────────

  startListening(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
    this.loading.set(true);
    this.users.set([]);
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp }                    = await import('firebase/app');
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'));

      this.unsub = onSnapshot(
        q,
        snap => {
          this.users.set(
            snap.docs.map(d => ({
              docId:       d.id,   // = lowercase email
              uid:         (d.data()['uid']         as string) || '',
              email:       (d.data()['email']        as string) || '',
              displayName: (d.data()['displayName']  as string) || '',
              role:        this.normalizeRole(d.data()['role'] as string) ?? 'editor',
              active:      (d.data()['active']       as boolean) ?? true,
              createdAt:   (d.data()['createdAt']    as { seconds: number; nanoseconds: number } | null) ?? null,
              createdBy:   (d.data()['createdBy']    as string) || '',
            })),
          );
          this.loading.set(false);
          this.error.set(null);
        },
        () => {
          this.error.set('Failed to load admin users. Check your Firestore rules.');
          this.loading.set(false);
        },
      );
    } catch {
      this.error.set('Failed to connect to Firestore.');
      this.loading.set(false);
    }
  }

  // ── CRUD operations ───────────────────────────────────────────────────────

  /**
   * Adds a new admin user.
   * Uses setDoc with email as the document ID so the auth service can look up
   * users via getDoc(doc(db, 'admin-users', email)) without needing a query.
   */
  async addUser(
    email:        string,
    role:         AdminRole,
    active:       boolean,
    createdByUid: string,
  ): Promise<void> {
    const { getApps, getApp, initializeApp }                     = await import('firebase/app');
    const { getFirestore, doc, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore');

    const app        = getApps().length ? getApp() : initializeApp(environment.firebase);
    const db         = getFirestore(app);
    const lowerEmail = email.trim().toLowerCase();
    const adminRef   = doc(db, COLLECTION, lowerEmail);

    // Prevent overwriting an existing document
    const existing = await getDoc(adminRef);
    if (existing.exists()) {
      throw new Error(`An admin user with email ${lowerEmail} already exists.`);
    }

    await setDoc(adminRef, {
      uid:         '',   // Populated when the user first signs in
      email:       lowerEmail,
      displayName: '',
      role,
      active,
      createdAt:   serverTimestamp(),
      createdBy:   createdByUid,
    });
  }

  async updateUserRole(docId: string, role: AdminRole): Promise<void> {
    const { getApps, getApp, initializeApp }  = await import('firebase/app');
    const { getFirestore, doc, updateDoc }    = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { role });
  }

  async activateUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }  = await import('firebase/app');
    const { getFirestore, doc, updateDoc }    = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { active: true });
  }

  async deactivateUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }  = await import('firebase/app');
    const { getFirestore, doc, updateDoc }    = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { active: false });
  }

  async deleteUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }  = await import('firebase/app');
    const { getFirestore, doc, deleteDoc }    = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await deleteDoc(doc(getFirestore(app), COLLECTION, docId));
  }

  /**
   * Looks up a single admin user by email.
   * Uses getDoc (direct read by email-as-ID) instead of a collection query.
   */
  async getUserByEmail(email: string): Promise<AdminUser | null> {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    const { getFirestore, doc, getDoc }      = await import('firebase/firestore');

    const app        = getApps().length ? getApp() : initializeApp(environment.firebase);
    const lowerEmail = email.trim().toLowerCase();
    const d          = await getDoc(doc(getFirestore(app), COLLECTION, lowerEmail));

    if (!d.exists()) return null;

    return {
      docId:       d.id,
      uid:         (d.data()['uid']         as string) || '',
      email:       (d.data()['email']        as string) || '',
      displayName: (d.data()['displayName']  as string) || '',
      role:        this.normalizeRole(d.data()['role'] as string) ?? 'editor',
      active:      (d.data()['active']       as boolean) ?? true,
      createdAt:   (d.data()['createdAt']    as { seconds: number; nanoseconds: number } | null) ?? null,
      createdBy:   (d.data()['createdBy']    as string) || '',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Normalises 'super-admin' → 'super_admin' etc. */
  private normalizeRole(raw: string): AdminRole | null {
    const n = (raw ?? '').toLowerCase().replace(/-/g, '_').trim();
    if (n === 'super_admin') return 'super_admin';
    if (n === 'admin')       return 'admin';
    if (n === 'editor')      return 'editor';
    return null;
  }
}
