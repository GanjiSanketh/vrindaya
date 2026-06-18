import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser }                        from '@angular/common';
import { environment }                              from '../../../../environments/environment';
import { AdminUser, AdminRole }                     from '../models/admin-user.model';

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
      const { getApps, getApp, initializeApp }          = await import('firebase/app');
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'));

      this.unsub = onSnapshot(
        q,
        snap => {
          this.users.set(
            snap.docs.map(d => ({
              docId:       d.id,
              uid:         (d.data()['uid']         as string) || '',
              email:       (d.data()['email']        as string) || '',
              displayName: (d.data()['displayName']  as string) || '',
              role:        (d.data()['role']         as AdminRole),
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

  async addUser(
    email:        string,
    role:         AdminRole,
    active:       boolean,
    createdByUid: string,
  ): Promise<void> {
    const { getApps, getApp, initializeApp }              = await import('firebase/app');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    const db  = getFirestore(app);

    await addDoc(collection(db, COLLECTION), {
      uid:         '',                     // Populated when the user first signs in
      email:       email.trim().toLowerCase(),
      displayName: '',
      role,
      active,
      createdAt:   serverTimestamp(),
      createdBy:   createdByUid,
    });
  }

  async updateUserRole(docId: string, role: AdminRole): Promise<void> {
    const { getApps, getApp, initializeApp }   = await import('firebase/app');
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { role });
  }

  async activateUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }   = await import('firebase/app');
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { active: true });
  }

  async deactivateUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }   = await import('firebase/app');
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await updateDoc(doc(getFirestore(app), COLLECTION, docId), { active: false });
  }

  async deleteUser(docId: string): Promise<void> {
    const { getApps, getApp, initializeApp }     = await import('firebase/app');
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    await deleteDoc(doc(getFirestore(app), COLLECTION, docId));
  }

  async getUserByEmail(email: string): Promise<AdminUser | null> {
    const { getApps, getApp, initializeApp }              = await import('firebase/app');
    const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');

    const app   = getApps().length ? getApp() : initializeApp(environment.firebase);
    const db    = getFirestore(app);
    const snap  = await getDocs(
      query(collection(db, COLLECTION), where('email', '==', email.toLowerCase())),
    );

    if (snap.empty) return null;
    const d = snap.docs[0];
    return {
      docId:       d.id,
      uid:         (d.data()['uid']         as string) || '',
      email:       (d.data()['email']        as string) || '',
      displayName: (d.data()['displayName']  as string) || '',
      role:        (d.data()['role']         as AdminRole),
      active:      (d.data()['active']       as boolean) ?? true,
      createdAt:   (d.data()['createdAt']    as { seconds: number; nanoseconds: number } | null) ?? null,
      createdBy:   (d.data()['createdBy']    as string) || '',
    };
  }
}
