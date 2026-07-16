import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Timestamp } from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import {
  MarketingSubscriber,
  MarketingSubscribeInput,
  SubscribeResult,
  MOBILE_NUMBER_PATTERN,
} from '../models/marketing-subscriber.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';
import { formatShortDate } from '../../../shared/utils/date-format.util';
import { LoggerService } from '../../../core/services/logger.service';

/**
 * Document schema: marketingSubscribers/{mobileNumber}
 *
 * The document ID is always the subscriber's mobile number — never an
 * auto-ID. Duplicate detection is a direct getDoc() lookup on that ID;
 * it never uses query()/where()/getDocs().
 */
const COLLECTION = 'marketingSubscribers';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly pid    = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  readonly subscribers = signal<MarketingSubscriber[]>([]);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);

  readonly totalCount = computed(() => this.subscribers().length);
  readonly todayCount = computed(() => this.countSince(this.startOfToday()));
  readonly weekCount  = computed(() => this.countSince(this.startOfWeek()));
  readonly monthCount = computed(() => this.countSince(this.startOfMonth()));

  private unsub: (() => void) | null = null;

  constructor() {
    this.logger.log('[Marketing] Marketing service initialized');
  }

  // ── Real-time listener (admin dashboard) ────────────────────────────────────

  getSubscribers(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.logger.log('[Marketing] Reading subscribers — collection:', COLLECTION);
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
    this.loading.set(true);
    this.subscribers.set([]);
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));

      this.logger.log('[Marketing] Firestore query started');

      this.unsub = onSnapshot(
        q,
        snap => {
          // An empty snapshot is a valid, successful result — never treated as an error.
          this.subscribers.set(snap.docs.map(d => this.toSubscriber(d.id, d.data())));
          this.loading.set(false);
          this.error.set(null);
          this.logger.log('[Marketing] Firestore query completed — subscriber count:', snap.docs.length);
        },
        err => {
          this.logger.error('[Marketing]', err);
          this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
          this.loading.set(false);
        },
      );
    } catch (err) {
      this.logger.error('[Marketing]', err);
      this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
      this.loading.set(false);
    }
  }

  // ── Subscriber operations ───────────────────────────────────────────────────

  /**
   * Registers a new VIP Club subscriber, keyed by mobile number.
   *
   * Duplicate detection is a direct getDoc() on `marketingSubscribers/{mobileNumber}`
   * — never a query()/where()/getDocs() scan. If the document already exists,
   * nothing is written and `'duplicate'` is returned; otherwise the document
   * is created with setDoc() (auto-ID is never used).
   */
  async subscribe(input: MarketingSubscribeInput): Promise<SubscribeResult> {
    if (!isPlatformBrowser(this.pid)) {
      throw new Error('Subscription is only available in the browser.');
    }

    const mobileNumber = input.mobileNumber.trim();
    if (!MOBILE_NUMBER_PATTERN.test(mobileNumber)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const { getApps, getApp, initializeApp }                      = await import('firebase/app');
    const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    const db  = getFirestore(app);
    const ref = doc(db, COLLECTION, mobileNumber);

    this.logger.log('[Marketing] Checking subscriber...', ref.path);

    try {
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        this.logger.log('[Marketing] Subscriber found');
        this.logger.log('[Marketing] Duplicate subscriber');
        return 'duplicate';
      }

      this.logger.log('[Marketing] Creating subscriber');

      const firstName = input.firstName?.trim();
      const payload: Record<string, unknown> = {
        mobileNumber,
        source:    input.source,
        status:    'ACTIVE',
        consent:   input.consent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      // Firestore rejects `undefined` field values, so an empty first name is
      // omitted entirely rather than written as an empty string.
      if (firstName) payload['firstName'] = firstName;

      await setDoc(ref, payload);

      this.logger.log('[Marketing] Subscriber created');
      return 'subscribed';
    } catch (err) {
      this.logger.error('[Marketing]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  /** Direct getDoc() existence check on the mobile-number document ID — never a query. */
  async subscriberExists(mobileNumber: string): Promise<boolean> {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    const { getFirestore, doc, getDoc }      = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(environment.firebase);
    const ref = doc(getFirestore(app), COLLECTION, mobileNumber.trim());

    this.logger.log('[Marketing] Checking subscriber...', ref.path);

    try {
      const snapshot = await getDoc(ref);
      this.logger.log(snapshot.exists() ? '[Marketing] Subscriber found' : '[Marketing] Subscriber not found');
      return snapshot.exists();
    } catch (err) {
      this.logger.error('[Marketing]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  async deleteSubscriber(mobileNumber: string): Promise<void> {
    this.logger.log('[Marketing] Delete subscriber:', mobileNumber);

    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, deleteDoc }   = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await deleteDoc(doc(getFirestore(app), COLLECTION, mobileNumber));
    } catch (err) {
      this.logger.error('[Marketing]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  exportSubscribers(): void {
    if (!isPlatformBrowser(this.pid)) return;
    this.logger.log('[Marketing] CSV export started — subscriber count:', this.totalCount());

    const header: string[] = ['Mobile Number', 'First Name', 'Joined Date', 'Status', 'Source'];
    const rows: string[][] = this.subscribers().map(s => [
      s.mobileNumber,
      s.firstName ?? '',
      this.formatDate(s.createdAt),
      s.status,
      s.source,
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => this.escapeCsvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `vrindaya-marketing-subscribers-${this.formatFilenameDate()}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Translates a Firebase/Firestore error into an actionable message. */
  private toSubscriber(id: string, data: Record<string, unknown>): MarketingSubscriber {
    return {
      mobileNumber: (data['mobileNumber'] as string) || id,
      firstName:    (data['firstName'] as string) || undefined,
      source:       (data['source'] as string) || '',
      status:       'ACTIVE',
      consent:      (data['consent'] as boolean) ?? false,
      createdAt:    data['createdAt'] as Timestamp,
      updatedAt:    data['updatedAt'] as Timestamp,
    };
  }

  private countSince(boundary: Date): number {
    return this.subscribers().filter(s => s.createdAt && s.createdAt.toMillis() >= boundary.getTime()).length;
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfWeek(): Date {
    const d = this.startOfToday();
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  private startOfMonth(): Date {
    const d = this.startOfToday();
    d.setDate(1);
    return d;
  }

  formatDate(ts: Timestamp | null | undefined): string {
    return formatShortDate(ts);
  }

  private formatFilenameDate(): string {
    const d    = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private escapeCsvCell(value: string): string {
    const cell = value ?? '';
    return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  }
}
