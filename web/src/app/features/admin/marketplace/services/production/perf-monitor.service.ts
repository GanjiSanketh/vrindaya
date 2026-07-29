import { Injectable, signal } from '@angular/core';
import type { PerfMetric } from './production.models';

@Injectable({ providedIn: 'root' })
export class PerfMonitorService {
  private readonly maxMetrics = 200;

  readonly metrics = signal<PerfMetric[]>([]);

  private readonly marks = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, operation: string): number {
    const start = this.marks.get(name);
    if (start === undefined) return 0;
    const duration = Math.round(performance.now() - start);
    const metric: PerfMetric = {
      operation, duration, timestamp: new Date(),
      metadata: { mark: name },
    };
    this.metrics.update(m => [metric, ...m].slice(0, this.maxMetrics));
    this.marks.delete(name);
    return duration;
  }

  async trace<T>(name: string, operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = Math.round(performance.now() - start);
      this.metrics.update(m => [{
        operation, duration, timestamp: new Date(),
        metadata: { mark: name },
      }, ...m].slice(0, this.maxMetrics));
    }
  }

  clear(): void {
    this.metrics.set([]);
    this.marks.clear();
  }
}
