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
    const app = await this.getApp();
    const { getFirestore } = await import('firebase/firestore');
    this.firestoreInstance = getFirestore(app);
    return this.firestoreInstance;
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
