import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FlipkartAutomation } from './platforms/flipkart';
import { MeeshoAutomation } from './platforms/meesho';
import { AmazonAutomation } from './platforms/amazon';
import { BasePlatformAutomation } from './platforms/base-platform';
import type { PublishResult } from './platforms/base-platform';

const POLL_INTERVAL_MS = 10_000;
const CONCURRENCY = 1;

initializeApp({ credential: cert('service-account.json') });
const db = getFirestore();
const automations: Record<string, BasePlatformAutomation> = {
  flipkart: new FlipkartAutomation(),
  meesho: new MeeshoAutomation(),
  amazon: new AmazonAutomation(),
};

interface TaskDoc {
  id?: string;
  platform: string;
  action: string;
  marketplaceListingId?: string;
  data: Record<string, unknown>;
  status: string;
  retryCount: number;
  maxRetries: number;
  credentials?: { username: string; password: string };
}

async function processTask(task: TaskDoc): Promise<void> {
  const ref = db.collection('automationQueue').doc(task.id!);
  const platform = automations[task.platform];
  if (!platform) { await ref.update({ status: 'failed', error: `Unknown platform: ${task.platform}` }); return; }

  const browser = await platform.launch();
  try {
    const page = await platform.newPage(browser);
    await platform.login(page, task.credentials!.username, task.credentials!.password);

    let result: PublishResult | void;
    switch (task.action) {
      case 'create':
        result = await platform.createListing(page, task.data);
        break;
      case 'update_price':
        await platform.updatePrice(page, task.marketplaceListingId!, task.data['price'] as number);
        break;
      case 'update_stock':
        await platform.updateStock(page, task.marketplaceListingId!, task.data['stock'] as number);
        break;
      case 'update_images':
        await platform.updateImages(page, task.marketplaceListingId!, task.data['images'] as string[]);
        break;
      case 'update_description':
        await platform.updateDescription(page, task.marketplaceListingId!, task.data['description'] as string);
        break;
    }

    await ref.update({
      status: 'completed',
      result: result ?? { listingUrl: page.url(), marketplaceId: '', fsn: '', marketplaceStatus: 'updated' },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const error = (err as Error).message;
    const retryCount = (task.retryCount ?? 0) + 1;
    if (retryCount >= (task.maxRetries ?? 3)) {
      await ref.update({ status: 'failed', retryCount, error, updatedAt: new Date().toISOString() });
    } else {
      await ref.update({ status: 'queued', retryCount, error, updatedAt: new Date().toISOString() });
    }
  } finally {
    await browser.close();
  }
}

async function poll(): Promise<void> {
  console.log(`[Runner] Polling for queued tasks...`);
  const snap = await db.collection('automationQueue')
    .where('status', '==', 'queued')
    .orderBy('priority', 'asc')
    .orderBy('createdAt', 'asc')
    .limit(CONCURRENCY)
    .get();

  for (const doc of snap.docs) {
    const task = { id: doc.id, ...doc.data() } as TaskDoc;
    const platformDoc = await db.collection('marketplacePlatforms').doc(task.platform).get();
    const creds = platformDoc.data()?.credentials;
    if (creds?.automationUsername && creds?.automationPassword) {
      task.credentials = { username: creds.automationUsername, password: creds.automationPassword };
    }
    await db.collection('automationQueue').doc(task.id!).update({ status: 'running', updatedAt: new Date().toISOString() });
    await processTask(task);
  }
}

(async () => {
  console.log('[Runner] Starting automation worker...');
  while (true) {
    try { await poll(); } catch (err) { console.error('[Runner] Poll error:', err); }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
})();
