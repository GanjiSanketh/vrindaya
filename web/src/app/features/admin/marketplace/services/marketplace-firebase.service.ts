import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarketplaceFirebaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private firestoreInstance: Firestore | null = null;
  private initPromise: Promise<Firestore> | null = null;

  async getFirestore(): Promise<Firestore> {
    if (this.firestoreInstance) return this.firestoreInstance;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.init();
    return this.initPromise;
  }

  private async init(): Promise<Firestore> {
    try {
      const app = await this.getApp();
      const { getFirestore } = await import('firebase/firestore');
      this.firestoreInstance = getFirestore(app);
      return this.firestoreInstance;
    } catch (err) {
      // A failed init must NOT be cached: every consumer (Vrindaya Story, Hero
      // Showcase, analytics settings, …) shares this single promise, so a
      // transient failure here (lazy firebase chunk blip, init race) would
      // otherwise pin every Firestore-backed section to its fallback for the
      // whole session. Reset so the next call retries the init.
      this.initPromise = null;
      this.firestoreInstance = null;
      throw err;
    }
  }

  private async getApp(): Promise<FirebaseApp> {
    if (!isPlatformBrowser(this.platformId)) {
      const { initializeApp } = await import('firebase/app');
      return initializeApp(environment.firebase);
    }
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    return getApps().length === 0
      ? initializeApp(environment.firebase)
      : getApp();
  }
}
