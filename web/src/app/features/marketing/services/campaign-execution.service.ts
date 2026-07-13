import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../models/campaign.model';
import { CampaignExecution } from '../models/campaign-execution.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';

const EXECUTIONS_COLLECTION = 'campaignExecutions';

/**
 * Creates and tracks CampaignExecution records. Deliberately separate from
 * CampaignQueueService/WhatsApp sending — this service only ever writes
 * QUEUED at creation time. Updating processedRecipients/successfulRecipients/
 * failedRecipients/status as a campaign actually sends is the batch-sending
 * worker's job (next phase), not this service's.
 */
@Injectable({ providedIn: 'root' })
export class CampaignExecutionService {
  private readonly pid = inject(PLATFORM_ID);

  readonly currentExecution = signal<CampaignExecution | null>(null);
  readonly currentLoading   = signal(true);
  readonly currentError     = signal<string | null>(null);

  private unsub: (() => void) | null = null;

  // ── Create ───────────────────────────────────────────────────────────────

  /** Called once, right after CampaignQueueService.enqueueForCampaign — see CampaignFormComponent.sendCampaign. */
  async createExecution(campaign: Campaign, totalRecipients: number, createdBy: string): Promise<string> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      const payload: Record<string, unknown> = {
        campaignId:            campaign.id,
        campaignName:          campaign.campaignName,
        status:                'QUEUED',
        totalRecipients,
        processedRecipients:   0,
        successfulRecipients:  0,
        failedRecipients:      0,
        startedAt:             null,
        completedAt:           null,
        createdBy,
        createdAt:             serverTimestamp(),
        updatedAt:             serverTimestamp(),
      };

      const ref = await addDoc(collection(db, EXECUTIONS_COLLECTION), payload);
      return ref.id;
    } catch (err) {
      console.error('[CampaignExecution]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Stats sync ───────────────────────────────────────────────────────────

  /**
   * Pure persistence — callers compute the numbers (see
   * CampaignRecipientService.getStatusCounts) and pass them in. Keeps this
   * service agnostic of where recipient data lives, mirroring how
   * WhatsAppService stays agnostic of Meta's API in the .NET backend.
   */
  async updateExecutionStats(executionId: string, stats: {
    totalRecipients: number;
    processedRecipients: number;
    successfulRecipients: number;
    failedRecipients: number;
  }): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await updateDoc(doc(getFirestore(app), EXECUTIONS_COLLECTION, executionId), {
        ...stats,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[CampaignExecution]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Lookup ───────────────────────────────────────────────────────────────

  /** Resolves the execution to show on the progress page from a campaignId (the route param). */
  async fetchLatestExecutionForCampaign(campaignId: string): Promise<CampaignExecution | null> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q = query(
        collection(db, EXECUTIONS_COLLECTION),
        where('campaignId', '==', campaignId),
        orderBy('createdAt', 'desc'),
        limit(1),
      );

      const snap = await getDocs(q);
      return snap.empty ? null : this.toExecution(snap.docs[0].id, snap.docs[0].data());
    } catch (err) {
      console.error('[CampaignExecution]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Real-time single-execution listener (progress page) ────────────────────

  watchExecution(executionId: string): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.currentLoading.set(true);
    this.setupSnapshot(executionId);
  }

  stopWatchingExecution(): void {
    this.unsub?.();
    this.unsub = null;
    this.currentLoading.set(true);
    this.currentExecution.set(null);
  }

  private async setupSnapshot(executionId: string): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      this.unsub = onSnapshot(
        doc(db, EXECUTIONS_COLLECTION, executionId),
        snap => {
          this.currentExecution.set(snap.exists() ? this.toExecution(snap.id, snap.data()) : null);
          this.currentLoading.set(false);
          this.currentError.set(null);
        },
        err => {
          console.error('[CampaignExecution]', err);
          this.currentError.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
          this.currentLoading.set(false);
        },
      );
    } catch (err) {
      console.error('[CampaignExecution]', err);
      this.currentError.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
      this.currentLoading.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toExecution(id: string, data: Record<string, unknown>): CampaignExecution {
    return {
      id,
      campaignId:            (data['campaignId'] as string) || '',
      campaignName:          (data['campaignName'] as string) || '',
      status:                (data['status'] as CampaignExecution['status']) ?? 'QUEUED',
      totalRecipients:       (data['totalRecipients'] as number) ?? 0,
      processedRecipients:   (data['processedRecipients'] as number) ?? 0,
      successfulRecipients:  (data['successfulRecipients'] as number) ?? 0,
      failedRecipients:      (data['failedRecipients'] as number) ?? 0,
      startedAt:             (data['startedAt'] as CampaignExecution['startedAt']) ?? null,
      completedAt:           (data['completedAt'] as CampaignExecution['completedAt']) ?? null,
      createdBy:             (data['createdBy'] as string) || '',
      createdAt:             data['createdAt'] as CampaignExecution['createdAt'],
      updatedAt:             data['updatedAt'] as CampaignExecution['updatedAt'],
    };
  }

}
