import { Injectable, signal } from '@angular/core';
import type { RequestLog } from './production.models';

@Injectable({ providedIn: 'root' })
export class RequestLoggerService {
  private readonly maxLogs = 500;

  readonly logs = signal<RequestLog[]>([]);

  log(opts: { operation: string; collection: string; documentId?: string; method: RequestLog['method']; duration: number; status: RequestLog['status']; userId?: string; error?: string }): void {
    const entry: RequestLog = {
      operation: opts.operation, collection: opts.collection,
      documentId: opts.documentId, method: opts.method,
      duration: opts.duration, status: opts.status,
      userId: opts.userId, error: opts.error,
      createdAt: new Date(),
    };
    this.logs.update(l => [entry, ...l].slice(0, this.maxLogs));
  }

  clear(): void {
    this.logs.set([]);
  }
}
