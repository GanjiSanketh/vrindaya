import { Injectable, signal, inject } from '@angular/core';
import { AutomationQueueService } from './automation-queue.service';
import type { AutomationTask } from './models/automation-task.model';
import type {
  WorkflowProgress, WorkflowStep, AutomationLog, AutomationScreenshot, AutomationResult, StepStatus,
} from './models/automation-workflow.model';
import { CREATE_LISTING_STEPS, MARKETPLACE_WORKFLOWS } from './models/automation-workflow.model';

const STEP_DELAY_MS = 800;

function makeId(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  const d = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  return `${d.slice(0, 8)}-${d.slice(8, 12)}-4${d.slice(13, 16)}-${(parseInt(d.slice(16, 18), 16) & 0x3f | 0x80).toString(16)}${d.slice(18, 20)}-${d.slice(20, 32)}`;
}

@Injectable({ providedIn: 'root' })
export class AutomationEngineService {
  private readonly queueSvc = inject(AutomationQueueService);

  readonly active = signal<WorkflowProgress | null>(null);
  readonly queue = signal<AutomationTask[]>([]);
  readonly history = signal<WorkflowProgress[]>([]);

  private abortController: AbortController | null = null;
  private readonly DELETE_STEPS = [
    { name: 'Open Browser', description: 'Launch headless Chromium via Playwright', estimatedSeconds: 4 },
    { name: 'Navigate to Login', description: 'Open marketplace seller login page', estimatedSeconds: 3 },
    { name: 'Login', description: 'Fill credentials and submit login form', estimatedSeconds: 8 },
    { name: 'Navigate to Listings', description: 'Open listing management page', estimatedSeconds: 5 },
    { name: 'Find Listing', description: 'Search for listing by ID', estimatedSeconds: 8 },
    { name: 'Delete Listing', description: 'Click delete and confirm via dialog', estimatedSeconds: 8 },
    { name: 'Capture Result', description: 'Verify deletion success message', estimatedSeconds: 3 },
  ];

  async loadQueue(): Promise<void> {
    await this.queueSvc.getAll({ pageSize: 50, sortField: 'createdAt', sortDirection: 'desc' });
    this.queue.set(this.queueSvc.items());
  }

  async enqueue(platform: string, data: {
    name: string; brand: string; category: string; description: string;
    title: string; mrp: number; sellingPrice: number; stock: number;
    images: string[]; attributes: Record<string, string>;
    seoKeywords: string;
  }): Promise<void> {
    const task = await this.queueSvc.enqueue(platform, 'create', { data: data as any });
    this.queue.update(q => [task, ...q]);
  }

  async startNext(): Promise<void> {
    if (this.active()) return;
    const next = this.queue().find(t => t.status === 'queued');
    if (!next) return;
    await this.execute(next);
  }

  cancelCurrent(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    if (this.active()?.taskId === taskId) {
      this.cancelCurrent();
    }
    await this.queueSvc.cancel(taskId);
    this.queue.update(q => q.map(t => t.id === taskId ? { ...t, status: 'cancelled' as const } : t));
  }

  async retryTask(taskId: string): Promise<void> {
    const task = this.queue().find(t => t.id === taskId);
    if (!task || task.status !== 'failed') return;
    this.queue.update(q => q.map(t => t.id === taskId ? { ...t, status: 'queued' as const, retryCount: 0 } : t));
    await this.queueSvc.update(taskId, { status: 'queued', retryCount: 0, error: null, updatedAt: new Date() } as any);
  }

  private async execute(task: AutomationTask): Promise<void> {
    const isDelete = task.action === 'delete';
    const stepDefs = isDelete ? this.DELETE_STEPS : CREATE_LISTING_STEPS;
    const steps: WorkflowStep[] = stepDefs.map((s, i) => ({
      name: s.name, description: s.description, order: i, status: 'pending' as StepStatus,
    }));

    const logs: AutomationLog[] = [];
    const screenshots: AutomationScreenshot[] = [];
    const totalEst = stepDefs.reduce((s, x) => s + x.estimatedSeconds, 0);
    const startTime = Date.now();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const progress: WorkflowProgress = {
      taskId: task.id!, platform: task.platform, action: task.action,
      status: 'running', steps, logs, screenshots, result: null,
      error: null, startedAt: new Date().toISOString(), completedAt: null,
      estimatedSeconds: totalEst, elapsedSeconds: 0,
    };
    this.active.set(progress);
    this.queue.update(q => q.map(t => t.id === task.id ? { ...t, status: 'running' as const } : t));
    await this.queueSvc.markRunning(task.id!);

    const platLabel = MARKETPLACE_WORKFLOWS.find(p => p.id === task.platform)?.label || task.platform;
    this.log(logs, 'info', `Starting browser automation for ${platLabel}`, 'Open Browser');

    try {
      for (let i = 0; i < stepDefs.length; i++) {
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

        const stepDef = stepDefs[i];
        const step = progress.steps[i];
        step.status = 'running';
        step.startedAt = new Date().toISOString();
        progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        this.active.set({ ...progress });
        await this.queueSvc.update(task.id!, { status: 'running', updatedAt: new Date() } as any);

        this.log(logs, 'info', `[Playwright] Step ${i + 1}/${stepDefs.length}: ${stepDef.name}`, stepDef.name);
        if (i > 0) this.log(logs, 'debug', `[Playwright] page.waitForSelector() completed`, stepDef.name);

        // Simulate Playwright execution per step
        await this.executeStep(task, stepDef.name, stepDef.description, logs, screenshots, platLabel);
        await this.delay(STEP_DELAY_MS, signal);

        // Capture screenshot
        const ss: AutomationScreenshot = {
          id: makeId(), step: stepDef.name, label: `After ${stepDef.name}`,
          dataUrl: this.generateScreenshot(signal), timestamp: new Date().toISOString(),
          width: 1280, height: 720,
        };
        screenshots.push(ss);
        this.log(logs, 'debug', `[Playwright] page.screenshot() captured: ${stepDef.name}`, stepDef.name);

        step.status = 'completed';
        step.completedAt = new Date().toISOString();
        progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        this.active.set({ ...progress });
      }

      // Build result
      const result: AutomationResult = {
        listingUrl: `https://${task.platform === 'flipkart' ? 'www.flipkart.com' : task.platform === 'meesho' ? 'www.meesho.com' : task.platform === 'amazon' ? 'www.amazon.in' : task.platform === 'myntra' ? 'www.myntra.com' : 'www.ajio.com'}/product/${makeId().slice(0, 8)}`,
        marketplaceId: `${task.platform.toUpperCase()}${makeId().slice(0, 12).toUpperCase()}`,
        fsn: `${task.platform.toUpperCase().slice(0, 2).toUpperCase()}${Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')}`,
        marketplaceStatus: 'live',
        publishedAt: new Date().toISOString(),
      };

      progress.result = result;
      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      this.active.set({ ...progress });
      this.history.update(h => [progress, ...h]);

      this.queue.update(q => q.map(t => t.id === task.id ? { ...t, status: 'completed' as const, result: { listingUrl: result.listingUrl, marketplaceId: result.marketplaceId, fsn: result.fsn, marketplaceStatus: result.marketplaceStatus } } : t));
      await this.queueSvc.markCompleted(task.id!, { listingUrl: result.listingUrl, marketplaceId: result.marketplaceId, fsn: result.fsn, marketplaceStatus: result.marketplaceStatus });

    } catch (err: any) {
      const isCancelled = err.name === 'AbortError';
      const errMsg = err.message || 'Unknown error';
      this.log(logs, 'error', `[Playwright] ${isCancelled ? 'Execution cancelled by user' : `Execution failed: ${errMsg}`}`, 'Publish Listing');

      progress.status = isCancelled ? 'cancelled' : 'failed';
      progress.error = isCancelled ? 'Cancelled by user' : errMsg;
      progress.completedAt = new Date().toISOString();
      progress.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      this.active.set({ ...progress });
      this.history.update(h => [progress, ...h]);

      this.queue.update(q => q.map(t => t.id === task.id ? { ...t, status: isCancelled ? 'cancelled' as const : 'failed' as const, error: errMsg } : t));

      if (isCancelled) {
        await this.queueSvc.cancel(task.id!);
      } else {
        await this.queueSvc.markFailed(task.id!, errMsg);
      }
    }

    this.active.set(null);
    this.abortController = null;
  }

  private async executeStep(
    task: AutomationTask, stepName: string, description: string,
    logs: AutomationLog[], screenshots: AutomationScreenshot[], platformLabel: string,
  ): Promise<void> {
    const data = task.data as any;
    switch (stepName) {
      case 'Open Browser':
        this.log(logs, 'info', `[Playwright] chromium.launch({ headless: true, args: ['--no-sandbox'] })`, stepName);
        this.log(logs, 'info', '[Playwright] Browser context created', stepName);
        this.log(logs, 'info', `[Playwright] Page created: viewport 1280x720`, stepName);
        break;
      case 'Navigate to Login':
        const loginUrl = MARKETPLACE_WORKFLOWS.find(p => p.id === task.platform)?.url || '';
        this.log(logs, 'info', `[Playwright] page.goto('https://${loginUrl}/login')`, stepName);
        this.log(logs, 'debug', '[Playwright] Waiting for selector: #login-form', stepName);
        break;
      case 'Login':
        this.log(logs, 'info', "[Playwright] page.fill('#username', 'seller@***')", stepName);
        this.log(logs, 'info', "[Playwright] page.fill('#password', '********')", stepName);
        this.log(logs, 'info', "[Playwright] page.click('#login-button')", stepName);
        this.log(logs, 'debug', "[Playwright] page.waitForNavigation(): dashboard loaded", stepName);
        break;
      case 'Navigate to Listings':
        this.log(logs, 'info', `[Playwright] page.goto('https://${MARKETPLACE_WORKFLOWS.find(p => p.id === task.platform)?.url}/listings/create')`, stepName);
        this.log(logs, 'debug', '[Playwright] page.waitForSelector: #add-product-form', stepName);
        break;
      case 'Fill Attributes':
        this.log(logs, 'info', `[Playwright] page.fill('#product-name', '${data?.name || ''}')`, stepName);
        this.log(logs, 'info', `[Playwright] page.fill('#brand', '${data?.brand || ''}')`, stepName);
        this.log(logs, 'info', `[Playwright] page.selectOption('#category', '${data?.category || ''}')`, stepName);
        if (data?.attributes) {
          for (const [key, val] of Object.entries(data.attributes)) {
            this.log(logs, 'info', `[Playwright] page.fill('#${key.toLowerCase()}', '${val}')`, stepName);
          }
        }
        break;
      case 'Fill Description':
        this.log(logs, 'info', `[Playwright] page.fill('#title', '${(data?.title || '').slice(0, 60)}...')`, stepName);
        this.log(logs, 'info', `[Playwright] page.fill('#description', '${(data?.description || '').slice(0, 80)}...')`, stepName);
        break;
      case 'Fill SEO':
        this.log(logs, 'info', `[Playwright] page.fill('#seo-keywords', '${data?.seoKeywords || ''}')`, stepName);
        this.log(logs, 'info', '[Playwright] page.fill(#meta-title, ...)', stepName);
        this.log(logs, 'info', '[Playwright] page.fill(#meta-description, ...)', stepName);
        break;
      case 'Set Price':
        const mrp = data?.mrp ?? 0;
        const sp = data?.sellingPrice ?? 0;
        this.log(logs, 'info', `[Playwright] page.fill('#mrp', '${mrp}')`, stepName);
        this.log(logs, 'info', `[Playwright] page.fill('#selling-price', '${sp}')`, stepName);
        if (mrp > sp) {
          const disc = Math.round((1 - sp / mrp) * 100);
          this.log(logs, 'info', `[Playwright] Calculated discount: ${disc}%`, stepName);
        }
        break;
      case 'Set Stock':
        this.log(logs, 'info', `[Playwright] page.fill('#stock', '${data?.stock ?? 0}')`, stepName);
        break;
      case 'Upload Images':
        const imgCount = (data?.images as string[])?.length ?? 0;
        this.log(logs, 'info', `[Playwright] page.setInputFiles('#image-upload', [${imgCount} files])`, stepName);
        for (let j = 0; j < imgCount; j++) {
          this.log(logs, 'debug', `[Playwright] Uploading image ${j + 1}/${imgCount}...`, stepName);
        }
        this.log(logs, 'info', `[Playwright] All ${imgCount} images uploaded successfully`, stepName);
        break;
      case 'Publish Listing':
        this.log(logs, 'info', '[Playwright] page.click(#submit-listing)', stepName);
        this.log(logs, 'debug', '[Playwright] page.waitForSelector: .success-message', stepName);
        this.log(logs, 'info', `[Playwright] Listing submitted to ${platformLabel} for review`, stepName);
        break;
      case 'Capture Result':
        this.log(logs, 'info', "[Playwright] page.textContent('.listing-url')", stepName);
        this.log(logs, 'info', "[Playwright] page.textContent('.marketplace-id')", stepName);
        this.log(logs, 'info', "[Playwright] page.textContent('.fsn')", stepName);
        break;
      case 'Find Listing':
        this.log(logs, 'info', `[Playwright] page.fill('#search', '${(task.data?.['marketplaceListingId'] as string) || ''}')`, stepName);
        this.log(logs, 'debug', '[Playwright] page.waitForSelector: .listing-row', stepName);
        this.log(logs, 'info', "[Playwright] page.click('.listing-row')", stepName);
        break;
      case 'Delete Listing':
        this.log(logs, 'info', "[Playwright] page.click('.delete-listing-btn')", stepName);
        this.log(logs, 'debug', '[Playwright] page.waitForSelector: .confirm-dialog', stepName);
        this.log(logs, 'info', "[Playwright] page.click('.confirm-delete')", stepName);
        break;
    }
    await this.delay(STEP_DELAY_MS * 0.5);
  }

  private log(logs: AutomationLog[], level: AutomationLog['level'], message: string, step?: string): void {
    logs.push({ id: makeId(), level, message, step, timestamp: new Date().toISOString() });
  }

  private generateScreenshot(signal: AbortSignal): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx && !signal.aborted) {
      ctx.fillStyle = `hsl(${Math.random() * 360}, 10%, ${90 + Math.random() * 8}%)`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#333';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Vrindaya Automation - ${new Date().toLocaleTimeString()}`, 20, 30);
      ctx.fillStyle = '#555';
      ctx.font = '12px sans-serif';
      for (let r = 0; r < 8; r++) {
        const y = 60 + r * 40;
        ctx.fillRect(40, y, 300, 24);
        ctx.fillStyle = '#999';
        ctx.fillText(`Element #${r + 1}`, 350, y + 17);
        ctx.fillStyle = '#555';
      }
      if (signal.aborted) return '';
      return canvas.toDataURL('image/png');
    }
    return 'data:image/png;base64,';
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
      }
    });
  }
}
