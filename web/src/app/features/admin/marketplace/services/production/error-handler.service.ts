import { Injectable, inject, signal } from '@angular/core';
import { MarketplaceLogService } from '../marketplace-log.service';

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  source: string;
  severity: 'error' | 'critical';
  timestamp: Date;
  handled: boolean;
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class GlobalErrorHandlerService {
  private readonly logSvc = inject(MarketplaceLogService);

  readonly errors = signal<ErrorEvent[]>([]);

  handleError(error: unknown, source = 'unknown'): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    const ev: ErrorEvent = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      message, stack, source,
      severity: 'error', timestamp: new Date(), handled: false,
    };
    this.errors.update(e => [ev, ...e].slice(0, 50));
    this.logSvc.add({
      type: 'error', platform: 'system',
      message: `[${source}] ${message}`,
      details: stack ? stack.slice(0, 2000) : undefined,
      metadata: { source, timestamp: new Date().toISOString() },
    }).catch(() => {});

  }

  dismiss(id: string): void {
    this.errors.update(e => e.filter(x => x.id !== id));
  }

  clearAll(): void {
    this.errors.set([]);
  }
}
