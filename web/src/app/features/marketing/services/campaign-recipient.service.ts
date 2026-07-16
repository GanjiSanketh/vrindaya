import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import { CampaignRecipient, RECIPIENT_STATUSES, RecipientStatus } from '../models/campaign-recipient.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';
import { LoggerService } from '../../../core/services/logger.service';

const RECIPIENTS_COLLECTION = 'campaignRecipients';
const SUBSCRIBERS_COLLECTION = 'marketingSubscribers';

/** Comfortably under Firestore's 500-operation writeBatch limit — same value as CampaignQueueService. */
const WRITE_BATCH_CHUNK = 400;

/** Recipient list page size for the Execution Details page. */
const PAGE_SIZE = 25;

export type RecipientStatusFilter = RecipientStatus | 'ALL';

/**
 * Creates and paginates CampaignRecipient snapshots. Deliberately separate
 * from CampaignQueueService/CampaignExecutionService/WhatsApp sending —
 * this service only ever writes QUEUED at creation time and never sends
 * anything. Updating status/messageId/attempts/errorMessage/*At as a
 * campaign actually sends is the batch-sending worker's job (next phase).
 *
 * Unlike every other marketing service, the recipient list is NOT a live
 * onSnapshot() listener — a campaign can have thousands of recipients, and
 * downloading/re-rendering the full unfiltered collection on every change
 * would be a real anti-pattern. The Execution Details page instead does
 * one-time, cursor-paginated getDocs() fetches (see loadFirstPage/loadMore).
 */
@Injectable({ providedIn: 'root' })
export class CampaignRecipientService {
  private readonly pid    = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  readonly recipients        = signal<CampaignRecipient[]>([]);
  readonly loadingFirstPage  = signal(false);
  readonly loadingMore       = signal(false);
  readonly hasMore           = signal(false);
  readonly error             = signal<string | null>(null);

  private lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;
  private activeExecutionId = '';
  private activeStatusFilter: RecipientStatusFilter = 'ALL';

  // ── Creation (called once from CampaignFormComponent.sendCampaign) ────────

  /**
   * Loads every ACTIVE marketing subscriber (same eligibility rule as
   * CampaignQueueService.enqueueForCampaign) and snapshots one QUEUED
   * campaignRecipient per subscriber for this execution. Returns the
   * number of recipients created.
   */
  async createRecipientsForExecution(executionId: string, campaignId: string): Promise<number> {
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

      const recipientsCol = collection(db, RECIPIENTS_COLLECTION);
      const docs = subscribersSnap.docs;

      for (let i = 0; i < docs.length; i += WRITE_BATCH_CHUNK) {
        const chunk = docs.slice(i, i + WRITE_BATCH_CHUNK);
        const batch = writeBatch(db);

        for (const subscriberDoc of chunk) {
          const data = subscriberDoc.data();
          const payload: Record<string, unknown> = {
            executionId,
            campaignId,
            subscriberId: subscriberDoc.id,
            phoneNumber:  (data['mobileNumber'] as string) || subscriberDoc.id,
            status:       'QUEUED',
            attempts:     0,
            queuedAt:     serverTimestamp(),
            sentAt:       null,
            deliveredAt:  null,
            readAt:       null,
            failedAt:     null,
            updatedAt:    serverTimestamp(),
          };
          const firstName = data['firstName'] as string | undefined;
          if (firstName) payload['name'] = firstName;

          batch.set(doc(recipientsCol), payload);
        }

        await batch.commit();
      }

      return docs.length;
    } catch (err) {
      this.logger.error('[CampaignRecipient]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Aggregate status counts (feeds CampaignExecutionService.updateExecutionStats) ──

  async getStatusCounts(executionId: string): Promise<Record<RecipientStatus, number> & { total: number }> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, where, getCountFromServer } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const col = collection(db, RECIPIENTS_COLLECTION);

      const counts = await Promise.all(
        RECIPIENT_STATUSES.map(status =>
          getCountFromServer(query(col, where('executionId', '==', executionId), where('status', '==', status)))
            .then(snap => snap.data().count),
        ),
      );

      const byStatus = RECIPIENT_STATUSES.reduce(
        (acc, status, i) => ({ ...acc, [status]: counts[i] }),
        {} as Record<RecipientStatus, number>,
      );

      return { ...byStatus, total: counts.reduce((sum, c) => sum + c, 0) };
    } catch (err) {
      this.logger.error('[CampaignRecipient]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Paginated list (Execution Details page) ───────────────────────────────

  /** Resets to page 1 for a given execution + status filter. Call again whenever the filter changes. */
  async loadFirstPage(executionId: string, statusFilter: RecipientStatusFilter = 'ALL'): Promise<void> {
    this.activeExecutionId = executionId;
    this.activeStatusFilter = statusFilter;
    this.lastVisible = null;
    this.recipients.set([]);
    this.hasMore.set(false);
    this.error.set(null);

    this.loadingFirstPage.set(true);
    await this.fetchNextPage();
    this.loadingFirstPage.set(false);
  }

  /** Fetches the next page and appends it — the "lazy loading" affordance for large campaigns. */
  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadingMore.set(true);
    await this.fetchNextPage();
    this.loadingMore.set(false);
  }

  reset(): void {
    this.recipients.set([]);
    this.lastVisible = null;
    this.hasMore.set(false);
    this.error.set(null);
    this.activeExecutionId = '';
    this.activeStatusFilter = 'ALL';
  }

  private async fetchNextPage(): Promise<void> {
    if (!isPlatformBrowser(this.pid)) return;

    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const {
        getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs,
      } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const col = collection(db, RECIPIENTS_COLLECTION);

      const filters = [where('executionId', '==', this.activeExecutionId)];
      if (this.activeStatusFilter !== 'ALL') {
        filters.push(where('status', '==', this.activeStatusFilter));
      }

      const q = this.lastVisible
        ? query(col, ...filters, orderBy('queuedAt', 'asc'), startAfter(this.lastVisible), limit(PAGE_SIZE))
        : query(col, ...filters, orderBy('queuedAt', 'asc'), limit(PAGE_SIZE));

      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        this.lastVisible = snap.docs[snap.docs.length - 1];
      }
      this.hasMore.set(snap.docs.length === PAGE_SIZE);
      this.recipients.update(existing => [...existing, ...snap.docs.map(d => this.toRecipient(d.id, d.data()))]);
    } catch (err) {
      this.logger.error('[CampaignRecipient]', err);
      this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toRecipient(id: string, data: Record<string, unknown>): CampaignRecipient {
    return {
      id,
      executionId:  (data['executionId'] as string) || '',
      campaignId:   (data['campaignId'] as string) || '',
      subscriberId: (data['subscriberId'] as string) || '',
      name:         (data['name'] as string) || undefined,
      phoneNumber:  (data['phoneNumber'] as string) || '',
      status:       (data['status'] as RecipientStatus) ?? 'QUEUED',
      messageId:    (data['messageId'] as string) || undefined,
      errorMessage: (data['errorMessage'] as string) || undefined,
      attempts:     (data['attempts'] as number) ?? 0,
      queuedAt:     data['queuedAt'] as CampaignRecipient['queuedAt'],
      sentAt:       (data['sentAt'] as CampaignRecipient['sentAt']) ?? null,
      deliveredAt:  (data['deliveredAt'] as CampaignRecipient['deliveredAt']) ?? null,
      readAt:       (data['readAt'] as CampaignRecipient['readAt']) ?? null,
      failedAt:     (data['failedAt'] as CampaignRecipient['failedAt']) ?? null,
      updatedAt:    data['updatedAt'] as CampaignRecipient['updatedAt'],
    };
  }

}
