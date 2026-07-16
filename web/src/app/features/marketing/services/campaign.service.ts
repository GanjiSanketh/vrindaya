import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Timestamp } from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import { Campaign, CampaignInput, CampaignStatus } from '../models/campaign.model';
import { mapFirestoreError } from '../../../shared/utils/firestore-error.util';
import { LoggerService } from '../../../core/services/logger.service';

interface UploadedImage {
  url: string;
  publicId: string;
}

const MARKETING_ASSETS_URL = `${environment.apiBaseUrl}/marketing-assets/images`;

const CAMPAIGNS_COLLECTION = 'campaigns';
const SUBSCRIBERS_COLLECTION = 'marketingSubscribers';

/** Max file sizes, mirrored from storage.rules for a fast client-side check — match Meta's own Cloud API media limits. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 16 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly pid    = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly http   = inject(HttpClient);

  readonly campaigns = signal<Campaign[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  readonly draftCount       = computed(() => this.countByStatus('DRAFT'));
  readonly scheduledCount   = computed(() => this.countByStatus('SCHEDULED'));
  readonly readyToSendCount = computed(() => this.countByStatus('READY_TO_SEND'));
  readonly sentCount        = computed(() => this.countByStatus('SENT'));
  readonly cancelledCount   = computed(() => this.countByStatus('CANCELLED'));

  private unsub: (() => void) | null = null;

  // ── Real-time listener ────────────────────────────────────────────────────

  getCampaigns(): void {
    if (this.unsub || !isPlatformBrowser(this.pid)) return;
    this.loading.set(true);
    this.setupSnapshot();
  }

  stopListening(): void {
    this.unsub?.();
    this.unsub = null;
    this.loading.set(true);
    this.campaigns.set([]);
  }

  private async setupSnapshot(): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, orderBy, onSnapshot } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('createdAt', 'desc'));

      this.unsub = onSnapshot(
        q,
        snap => {
          this.campaigns.set(snap.docs.map(d => this.toCampaign(d.id, d.data())));
          this.loading.set(false);
          this.error.set(null);
        },
        err => {
          this.logger.error('[Campaigns]', err);
          this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
          this.loading.set(false);
        },
      );
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      this.error.set(mapFirestoreError(err, isPlatformBrowser(this.pid)));
      this.loading.set(false);
    }
  }

  // ── Lookups ──────────────────────────────────────────────────────────────

  /** Fast path for the View/Edit pages when the list is already loaded. */
  getCachedCampaign(id: string): Campaign | undefined {
    return this.campaigns().find(c => c.id === id);
  }

  /** Fallback for a direct page load/refresh, when the live list hasn't populated yet. */
  async fetchCampaign(id: string): Promise<Campaign | null> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const snap = await getDoc(doc(getFirestore(app), CAMPAIGNS_COLLECTION, id));
      return snap.exists() ? this.toCampaign(snap.id, snap.data()) : null;
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  /** Active subscriber count for the "All Active Subscribers" audience, via a server-side count aggregation. */
  async getActiveSubscriberCount(): Promise<number> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, query, where, getCountFromServer } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const q   = query(collection(db, SUBSCRIBERS_COLLECTION), where('status', '==', 'ACTIVE'));
      const snap = await getCountFromServer(q);
      return snap.data().count;
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async createCampaign(
    input: CampaignInput,
    status: CampaignStatus,
    scheduledAt: Date | null,
    createdBy: string,
  ): Promise<string> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, addDoc, serverTimestamp, Timestamp: FsTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const subscriberCount = await this.getActiveSubscriberCount();

      const payload: Record<string, unknown> = {
        campaignName:    input.campaignName,
        campaignType:    input.campaignType,
        mediaType:       input.mediaType,
        status,
        message:         input.message,
        audience:        input.audience,
        subscriberCount,
        createdBy,
        createdAt:       serverTimestamp(),
        updatedAt:       serverTimestamp(),
        scheduledAt:     scheduledAt ? FsTimestamp.fromDate(scheduledAt) : null,
      };
      if (input.imageUrl)     payload['imageUrl']     = input.imageUrl;
      if (input.videoUrl)     payload['videoUrl']     = input.videoUrl;
      if (input.documentUrl)  payload['documentUrl']  = input.documentUrl;
      if (input.thumbnailUrl) payload['thumbnailUrl'] = input.thumbnailUrl;
      if (input.caption)      payload['caption']      = input.caption;
      if (input.footer)       payload['footer']       = input.footer;
      if (input.buttonText)   payload['buttonText']   = input.buttonText;
      if (input.buttonUrl)    payload['buttonUrl']    = input.buttonUrl;

      const ref = await addDoc(collection(db, CAMPAIGNS_COLLECTION), payload);
      return ref.id;
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  async updateCampaign(
    id: string,
    input: CampaignInput,
    status: CampaignStatus,
    scheduledAt: Date | null,
  ): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, updateDoc, serverTimestamp, Timestamp: FsTimestamp, deleteField } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);
      const subscriberCount = await this.getActiveSubscriberCount();

      await updateDoc(doc(db, CAMPAIGNS_COLLECTION, id), {
        campaignName: input.campaignName,
        campaignType: input.campaignType,
        mediaType:    input.mediaType,
        status,
        message:      input.message,
        imageUrl:     input.imageUrl || deleteField(),
        videoUrl:     input.videoUrl || deleteField(),
        documentUrl:  input.documentUrl || deleteField(),
        thumbnailUrl: input.thumbnailUrl || deleteField(),
        caption:      input.caption || deleteField(),
        footer:       input.footer || deleteField(),
        buttonText:   input.buttonText || deleteField(),
        buttonUrl:    input.buttonUrl || deleteField(),
        audience:     input.audience,
        subscriberCount,
        updatedAt:    serverTimestamp(),
        scheduledAt:  scheduledAt ? FsTimestamp.fromDate(scheduledAt) : null,
      });
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  /** Moves a SCHEDULED or READY_TO_SEND campaign to CANCELLED. Never deletes it. */
  async cancelCampaign(id: string): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await updateDoc(doc(getFirestore(app), CAMPAIGNS_COLLECTION, id), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  /** Only ever called on DRAFT campaigns from the UI — enforced by the caller, not by rules. */
  async deleteCampaign(id: string): Promise<void> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      await deleteDoc(doc(getFirestore(app), CAMPAIGNS_COLLECTION, id));
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error(mapFirestoreError(err, isPlatformBrowser(this.pid)));
    }
  }

  // ── Media uploads ────────────────────────────────────────────────────────
  // Images go through the ASP.NET backend to Cloudinary (signed, server-side
  // upload — see MarketingAssetsController/CloudinaryService). Video/document
  // uploads are intentionally NOT part of the Cloudinary cutover — Cloudinary's
  // video/raw-file API is a different shape than this app's image-only
  // CloudinaryService, so those two stay on the pre-existing client-side
  // Firebase Storage path (public read so Meta can fetch the link,
  // admin-only write — see storage.rules) until a dedicated follow-up.

  async uploadCampaignImage(file: File): Promise<string> {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Image must be smaller than 5 MB.');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Please choose an image file.');
    }
    return this.uploadImageToBackend(file);
  }

  /** Also used for a campaign's optional thumbnail — a thumbnail is still just an image. */
  async uploadCampaignThumbnail(file: File): Promise<string> {
    return this.uploadCampaignImage(file);
  }

  async uploadCampaignVideo(file: File): Promise<string> {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('Video must be smaller than 16 MB (WhatsApp\'s limit).');
    }
    if (!file.type.startsWith('video/')) {
      throw new Error('Please choose a video file.');
    }
    return this.uploadToStorage(file, 'campaign-videos');
  }

  async uploadCampaignDocument(file: File): Promise<string> {
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new Error('Document must be smaller than 100 MB (WhatsApp\'s limit).');
    }
    if (file.type !== 'application/pdf') {
      throw new Error('Please choose a PDF file.');
    }
    return this.uploadToStorage(file, 'campaign-documents');
  }

  /** Signed, server-side upload to Cloudinary via the ASP.NET backend — see MarketingAssetsController. */
  private async uploadImageToBackend(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('section', 'campaign-images');
      formData.append('file', file);

      const result = await firstValueFrom(this.http.post<UploadedImage>(MARKETING_ASSETS_URL, formData));
      return result.url;
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error('Failed to upload image. Please try again.');
    }
  }

  private async uploadToStorage(file: File, folder: string): Promise<string> {
    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const storage = getStorage(app);
      const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const fileRef = ref(storage, path);

      await uploadBytes(fileRef, file, { contentType: file.type });
      return await getDownloadURL(fileRef);
    } catch (err) {
      this.logger.error('[Campaigns]', err);
      throw new Error('Failed to upload file. Please try again.');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private countByStatus(status: CampaignStatus): number {
    return this.campaigns().filter(c => c.status === status).length;
  }

  private toCampaign(id: string, data: Record<string, unknown>): Campaign {
    const imageUrl = (data['imageUrl'] as string) || undefined;

    return {
      id,
      campaignName:    (data['campaignName'] as string) || '',
      campaignType:    (data['campaignType'] as Campaign['campaignType']) ?? 'WhatsApp',
      // Campaigns created before mediaType existed have no such field — infer
      // 'Image' if one was already attached, otherwise default to 'Text',
      // so old drafts still open with the correct media section visible.
      mediaType:       (data['mediaType'] as Campaign['mediaType']) ?? (imageUrl ? 'Image' : 'Text'),
      status:          (data['status'] as CampaignStatus) ?? 'DRAFT',
      message:         (data['message'] as string) || '',
      imageUrl,
      videoUrl:        (data['videoUrl'] as string) || undefined,
      documentUrl:     (data['documentUrl'] as string) || undefined,
      thumbnailUrl:    (data['thumbnailUrl'] as string) || undefined,
      caption:         (data['caption'] as string) || undefined,
      footer:          (data['footer'] as string) || undefined,
      buttonText:      (data['buttonText'] as string) || undefined,
      buttonUrl:       (data['buttonUrl'] as string) || undefined,
      audience:        (data['audience'] as Campaign['audience']) ?? 'ALL_ACTIVE_SUBSCRIBERS',
      subscriberCount: (data['subscriberCount'] as number) ?? 0,
      createdBy:       (data['createdBy'] as string) || '',
      createdAt:       data['createdAt'] as Timestamp,
      updatedAt:       data['updatedAt'] as Timestamp,
      scheduledAt:     (data['scheduledAt'] as Timestamp | null) ?? null,
    };
  }

}
