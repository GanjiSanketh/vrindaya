import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { WhatsAppSettings, WhatsAppSettingsInput } from '../models/whatsapp-settings.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';

const COLLECTION = 'whatsappSettings';

/** A singleton settings document — WhatsApp Business config is per-project, not per-record. */
const DOC_ID = 'default';

@Injectable({ providedIn: 'root' })
export class WhatsAppSettingsService {
  private readonly pid = inject(PLATFORM_ID);

  readonly settings = signal<WhatsAppSettings | null>(null);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly saving   = signal(false);

  /**
   * True once every field required to attempt a send has been saved.
   * This does NOT mean the credentials are valid — that requires "Verify
   * Connection", which stays disabled until the Meta Cloud API is wired in.
   * It only gates whether Send Test / Send Campaign are clickable at all.
   */
  readonly isConfigured = computed(() => {
    const s = this.settings();
    return !!s && !!s.businessName && !!s.whatsappNumber && !!s.phoneNumberId && !!s.wabaId && !!s.accessToken;
  });

  private unsub: (() => void) | null = null;

  loadSettings(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const ref = doc(db, COLLECTION, DOC_ID);

      this.unsub = onSnapshot(
        ref,
        snap => {
          this.settings.set(snap.exists() ? this.toSettings(snap.data()) : null);
          this.loading.set(false);
          this.error.set(null);
        },
        err => {
          console.error('[WhatsApp]', err);
          this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
          this.loading.set(false);
        },
      );
    } catch (err) {
      console.error('[WhatsApp]', err);
      this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
      this.loading.set(false);
    }
  }

  async saveSettings(input: WhatsAppSettingsInput, updatedBy: string): Promise<void> {
    this.saving.set(true);
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      await setDoc(doc(db, COLLECTION, DOC_ID), {
        businessName:   input.businessName,
        whatsappNumber: input.whatsappNumber,
        phoneNumberId:  input.phoneNumberId,
        wabaId:         input.wabaId,
        accessToken:    input.accessToken,
        updatedBy,
        updatedAt:      serverTimestamp(),
      });
    } catch (err) {
      console.error('[WhatsApp]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    } finally {
      this.saving.set(false);
    }
  }

  private toSettings(data: Record<string, unknown>): WhatsAppSettings {
    return {
      businessName:   (data['businessName'] as string) || '',
      whatsappNumber: (data['whatsappNumber'] as string) || '',
      phoneNumberId:  (data['phoneNumberId'] as string) || '',
      wabaId:         (data['wabaId'] as string) || '',
      accessToken:    (data['accessToken'] as string) || '',
      updatedBy:      (data['updatedBy'] as string) || '',
      updatedAt:      (data['updatedAt'] as WhatsAppSettings['updatedAt']) ?? null,
    };
  }

}
