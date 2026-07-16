import type { Timestamp } from 'firebase/firestore';

/**
 * Safely converts a Firestore Timestamp, an ISO date string (as returned by
 * the ASP.NET API's JSON serialization), or null/undefined to epoch millis,
 * for sorting.
 */
export function timestampMillis(ts: Timestamp | string | null | undefined): number {
  if (!ts) return 0;
  if (typeof ts === 'string') {
    const millis = new Date(ts).getTime();
    return Number.isNaN(millis) ? 0 : millis;
  }
  return typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}
