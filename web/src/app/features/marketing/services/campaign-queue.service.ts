import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../models/campaign.model';
import { CampaignQueueItem, QueueStatus } from '../models/campaign-queue.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';
import { LoggerService } from '../../../core/services/logger.service';

const QUEUE_COLLECTION = 'campaignQueue';
const SUBSCRIBERS_COLLECTION = 'marketingSubscribers';

/** Comfortably under Firestore's 500-operation writeBatch limit. */
const WRITE_BATCH_CHUNK = 400;

@Injectable({ providedIn: 'root' })
export class CampaignQueueService {
  private readonly pid    = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  readonly queueItems = signal<CampaignQueueItem[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly enqueuing  = signal(false);

  readonly pendingCount    = computed(() => this.countByStatus('PENDING'));
  readonly processingCount = computed(() => this.countByStatus('PROCESSING'));
  readonly sentCount       = computed(() => this.countByStatus('SENT'));
  readonly deliveredCount  = computed(() => this.countByStatus('DELIVERED'));
  readonly readCount       = computed(() => this.countByStatus('READ'));
  readonly failedCount     = computed(() => this.countByStatus('FAILED'));

  private unsub: (() => void) | null = null;

  // ── Real-time listener ────────────────────────────────────────────────────

  getQueue(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
    this.loading.set(true);
    this.queueItems.set([]);
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, QUEUE_COLLECTION), orderBy('createdAt', 'desc'));

      this.unsub = onSnapshot(
        q,
        snap => {
          this.queueItems.set(snap.docs.map(d => this.toQueueItem(d.id, d.data())));
          this.loading.set(false);
          this.error.set(null);
        },
        err => {
          this.logger.error('[CampaignQueue]', err);
          this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
          this.loading.set(false);
        },
      );
    } catch (err) {
      this.logger.error('[CampaignQueue]', err);
      this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
      this.loading.set(false);
    }
  }

  // ── Fan-out ──────────────────────────────────────────────────────────────

  /**
   * Creates one PENDING queue document per active subscriber for this
   * campaign. This is the entire "send" pipeline for now — a future worker
   * (once the Meta Cloud API is wired in) would pick up PENDING items and
   * drive them through PROCESSING → SENT → DELIVERED → READ / FAILED.
   */
  async enqueueForCampaign(campaign: Campaign): Promise<number> {
    this.enqueuing.set(true);
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const {
        getFirestore, collection, doc, getDocs, query, where, writeBatch, serverTimestamp,
      } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      const subscribersSnap = await getDocs(
        query(collection(db, SUBSCRIBERS_COLLECTION), where('status', '==', 'ACTIVE')),
      );
      const recipients = subscribersSnap.docs.map(d => ({
        mobileNumber: (d.data()['mobileNumber'] as string) || d.id,
        firstName:    (d.data()['firstName'] as string) || undefined,
      }));

      const queueCol = collection(db, QUEUE_COLLECTION);
      for (let i = 0; i < recipients.length; i += WRITE_BATCH_CHUNK) {
        const chunk = recipients.slice(i, i + WRITE_BATCH_CHUNK);
        const batch = writeBatch(db);

        for (const recipient of chunk) {
          const payload: Record<string, unknown> = {
            campaignId:   campaign.id,
            campaignName: campaign.campaignName,
            mobileNumber: recipient.mobileNumber,
            status:       'PENDING',
            message:      campaign.message,
            createdAt:    serverTimestamp(),
            updatedAt:    serverTimestamp(),
          };
          if (recipient.firstName) payload['firstName'] = recipient.firstName;
          if (campaign.imageUrl)   payload['imageUrl']  = campaign.imageUrl;
          if (campaign.buttonUrl)  payload['buttonUrl'] = campaign.buttonUrl;

          batch.set(doc(queueCol), payload);
        }

        await batch.commit();
      }

      return recipients.length;
    } catch (err) {
      this.logger.error('[CampaignQueue]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    } finally {
      this.enqueuing.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private countByStatus(status: QueueStatus): number {
    return this.queueItems().filter(q => q.status === status).length;
  }

  private toQueueItem(id: string, data: Record<string, unknown>): CampaignQueueItem {
    return {
      id,
      campaignId:    (data['campaignId'] as string) || '',
      campaignName:  (data['campaignName'] as string) || '',
      mobileNumber:  (data['mobileNumber'] as string) || '',
      firstName:     (data['firstName'] as string) || undefined,
      status:        (data['status'] as QueueStatus) ?? 'PENDING',
      message:       (data['message'] as string) || '',
      imageUrl:      (data['imageUrl'] as string) || undefined,
      buttonUrl:     (data['buttonUrl'] as string) || undefined,
      failureReason: (data['failureReason'] as string) || undefined,
      createdAt:     data['createdAt'] as CampaignQueueItem['createdAt'],
      updatedAt:     data['updatedAt'] as CampaignQueueItem['updatedAt'],
    };
  }

}
