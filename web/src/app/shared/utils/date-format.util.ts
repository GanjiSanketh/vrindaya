import type { Timestamp } from 'firebase/firestore';

/**
 * Shared date/time formatting for Firestore Timestamps — extracted from
 * near-identical copies previously duplicated across marketing.service.ts,
 * campaign-list/campaign-history/campaign-queue-list/campaign-view/
 * execution-details/execution-progress-card components. Each component
 * keeps its own thin `formatDate`/`formatDateTime` method (templates can
 * only call instance methods, not imported functions directly) that just
 * delegates here.
 */

/** "12 Jul 2026" — date only, no time. */
export function formatShortDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "12 Jul 2026, 03:45 PM" — date and time. */
export function formatDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
