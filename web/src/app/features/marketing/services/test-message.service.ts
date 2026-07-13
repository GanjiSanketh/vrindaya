import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { MOBILE_NUMBER_PATTERN } from '../models/marketing-subscriber.model';
import { TestMessageInput } from '../models/test-message.model';

const COLLECTION = 'testMessages';

@Injectable({ providedIn: 'root' })
export class TestMessageService {
  private readonly pid = inject(PLATFORM_ID);

  /**
   * Records a test-send request. Status is always QUEUED — nothing is
   * actually dispatched until the Meta Cloud API call is implemented.
   */
  async sendTestMessage(input: TestMessageInput, createdBy: string): Promise<void> {
    if (!isPlatformBrowser(this.pid)) {
      throw new Error('Sending a test message is only available in the browser.');
    }

    const mobileNumber = input.mobileNumber.trim();
    if (!MOBILE_NUMBER_PATTERN.test(mobileNumber)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    try {
      const { getApps, getApp, initializeApp } = await import('firebase/app');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApps().length ? getApp() : initializeApp(environment.firebase);
      const db  = getFirestore(app);

      const payload: Record<string, unknown> = {
        mobileNumber,
        message:   input.message,
        status:    'QUEUED',
        createdBy,
        createdAt: serverTimestamp(),
      };
      if (input.campaignId) payload['campaignId'] = input.campaignId;
      if (input.imageUrl)   payload['imageUrl']   = input.imageUrl;
      if (input.buttonUrl)  payload['buttonUrl']  = input.buttonUrl;

      await addDoc(collection(db, COLLECTION), payload);
    } catch (err) {
      console.error('[TestMessage]', err);
      throw new Error('Failed to queue the test message. Please try again.');
    }
  }
}
