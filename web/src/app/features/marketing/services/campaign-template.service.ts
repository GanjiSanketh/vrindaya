import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Timestamp } from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import { CampaignTemplate, CampaignTemplateInput } from '../models/campaign-template.model';

const COLLECTION = 'campaignTemplates';

/** Seeded automatically the first time the collection is empty — see getTemplates(). */
const DEFAULT_TEMPLATES: CampaignTemplateInput[] = [
  {
    name: 'Welcome',
    message: 'Welcome to Vrindaya, {{name}}! 🌸 Thank you for joining our VIP Club. Enjoy exclusive access to new arrivals, festive collections and member-only offers.',
  },
  {
    name: 'New Collection',
    message: 'Hi {{name}}! ✨ Our new collection just dropped. Be the first to explore {{product}} — shop now: {{link}}',
  },
  {
    name: 'Festival',
    message: '🪔 Celebrate in style, {{name}}! Our Festival Collection is live as of {{date}}. Discover {{product}} today: {{link}}',
  },
  {
    name: 'GOAT Sale',
    message: "🔥 {{name}}, the GOAT Sale is here! Up to 50% off on your favorites. Grab {{product}} before it's gone: {{link}}",
  },
  {
    name: 'Price Drop',
    message: '💸 Price drop alert, {{name}}! {{product}} is now available at a special price. Check it out: {{link}}',
  },
  {
    name: 'Wishlist Reminder',
    message: "Hey {{name}}, {{product}} from your wishlist is still waiting for you! Grab it before it's gone: {{link}}",
  },
];

@Injectable({ providedIn: 'root' })
export class CampaignTemplateService {
  private readonly pid = inject(PLATFORM_ID);

  readonly templates = signal<CampaignTemplate[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly saving    = signal(false);

  private unsub: (() => void) | null = null;

  // ── Real-time listener (self-seeds the defaults once, if empty) ────────────

  getTemplates(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
    this.loading.set(true);
    this.templates.set([]);
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const col = collection(db, COLLECTION);

      const existing = await getDocs(col);
      if (existing.empty) {
        await Promise.all(
          DEFAULT_TEMPLATES.map(t =>
            setDoc(doc(col), {
              name:      t.name,
              message:   t.message,
              isDefault: true,
              createdAt: serverTimestamp(),
            }),
          ),
        );
      }

      const q = query(col, orderBy('name'));
      this.unsub = onSnapshot(
        q,
        snap => {
          this.templates.set(snap.docs.map(d => this.toTemplate(d.id, d.data())));
          this.loading.set(false);
          this.error.set(null);
        },
        err => {
          console.error('[CampaignTemplates]', err);
          this.error.set('Failed to load campaign templates.');
          this.loading.set(false);
        },
      );
    } catch (err) {
      console.error('[CampaignTemplates]', err);
      this.error.set('Failed to load campaign templates.');
      this.loading.set(false);
    }
  }

  // ── Lookups ──────────────────────────────────────────────────────────────

  getCachedTemplate(id: string): CampaignTemplate | undefined {
    return this.templates().find(t => t.id === id);
  }

  async fetchTemplate(id: string): Promise<CampaignTemplate | null> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const snap = await getDoc(doc(getFirestore(app), COLLECTION, id));
      return snap.exists() ? this.toTemplate(snap.id, snap.data()) : null;
    } catch (err) {
      console.error('[CampaignTemplates]', err);
      throw new Error('Failed to load the template.');
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async createTemplate(input: CampaignTemplateInput): Promise<string> {
    this.saving.set(true);
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      const payload: Record<string, unknown> = {
        name:      input.name,
        message:   input.message,
        isDefault: false,
        createdAt: serverTimestamp(),
      };
      if (input.imageUrl)  payload['imageUrl']  = input.imageUrl;
      if (input.buttonUrl) payload['buttonUrl'] = input.buttonUrl;

      const ref = await addDoc(collection(db, COLLECTION), payload);
      return ref.id;
    } catch (err) {
      console.error('[CampaignTemplates]', err);
      throw new Error('Failed to create the template.');
    } finally {
      this.saving.set(false);
    }
  }

  async updateTemplate(id: string, input: CampaignTemplateInput): Promise<void> {
    this.saving.set(true);
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, updateDoc, deleteField } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await updateDoc(doc(getFirestore(app), COLLECTION, id), {
        name:      input.name,
        message:   input.message,
        imageUrl:  input.imageUrl || deleteField(),
        buttonUrl: input.buttonUrl || deleteField(),
      });
    } catch (err) {
      console.error('[CampaignTemplates]', err);
      throw new Error('Failed to update the template.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await deleteDoc(doc(getFirestore(app), COLLECTION, id));
    } catch (err) {
      console.error('[CampaignTemplates]', err);
      throw new Error('Failed to delete the template.');
    }
  }

  private toTemplate(id: string, data: Record<string, unknown>): CampaignTemplate {
    return {
      id,
      name:      (data['name'] as string) || '',
      message:   (data['message'] as string) || '',
      imageUrl:  (data['imageUrl'] as string) || undefined,
      buttonUrl: (data['buttonUrl'] as string) || undefined,
      isDefault: (data['isDefault'] as boolean) ?? false,
      createdAt: data['createdAt'] as Timestamp,
    };
  }
}
