import { Injectable, signal, inject } from '@angular/core';
import { AutomationQueueService } from './automation-queue.service';
import { MarketplaceLogService } from '../marketplace-log.service';
import type { AutomationTask, AutomationAction } from './models/automation-task.model';

export interface ScheduleEntry {
  id: string;
  platform: string;
  action: AutomationAction;
  label: string;
  cron: string;
  payload: Record<string, unknown>;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
}

const STORAGE_KEY = 'vrindaya_automation_schedules';

@Injectable({ providedIn: 'root' })
export class AutomationSchedulerService {
  private readonly queueSvc = inject(AutomationQueueService);
  private readonly logSvc = inject(MarketplaceLogService);

  readonly schedules = signal<ScheduleEntry[]>([]);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
    this.start();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.schedules.set(JSON.parse(raw));
    } catch { this.schedules.set([]); }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schedules()));
  }

  add(entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'lastRun' | 'nextRun'>): void {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.schedules.update(s => [...s, { ...entry, id, lastRun: null, nextRun: this.computeNext(entry.cron), createdAt: now }]);
    this.save();
  }

  update(id: string, partial: Partial<ScheduleEntry>): void {
    this.schedules.update(s => s.map(e => e.id === id ? { ...e, ...partial } : e));
    this.save();
  }

  remove(id: string): void {
    this.schedules.update(s => s.filter(e => e.id !== id));
    this.save();
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 60_000);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const entry of this.schedules()) {
      if (!entry.enabled || !entry.nextRun) continue;
      const next = new Date(entry.nextRun).getTime();
      if (now >= next) {
        try {
          await this.queueSvc.enqueue(entry.platform, entry.action, {
            data: entry.payload,
          });
          this.update(entry.id, {
            lastRun: new Date().toISOString(),
            nextRun: this.computeNext(entry.cron),
          });
          await this.logSvc.add({
            type: 'info', platform: entry.platform,
            message: `Scheduled task executed: ${entry.label}`,
            details: `Action: ${entry.action}`,
          });
        } catch { /* skip failed schedule tick */ }
      }
    }
  }

  private computeNext(cron: string): string {
    const now = new Date();
    const parts = cron.split(' ');
    if (parts.length < 2) return new Date(now.getTime() + 3600_000).toISOString();
    const interval = parseInt(parts[0], 10);
    const unit = parts[1];
    let ms = 3600_000;
    if (unit === 'm' || unit === 'min') ms = interval * 60_000;
    else if (unit === 'h' || unit === 'hr') ms = interval * 3600_000;
    else if (unit === 'd' || unit === 'day') ms = interval * 86400_000;
    return new Date(now.getTime() + ms).toISOString();
  }
}
