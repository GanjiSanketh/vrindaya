/**
 * Maps a Firestore/Firebase error into a user-facing message. Shared across
 * every marketing service (Campaign, CampaignQueue, CampaignExecution,
 * CampaignRecipient, Marketing, WhatsAppSettings) — each previously carried
 * its own near-identical private copy of this switch statement, with a
 * slightly different subset of cases depending on which error codes that
 * service happened to encounter first. This is the union of all of them,
 * so no existing case's message changed for any caller; some callers now
 * additionally get a more specific message than the "Something went wrong"
 * fallback for a code they didn't previously special-case.
 */
export function mapFirestoreError(err: unknown, isBrowser: boolean): string {
  if (isBrowser && typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection.';
  }

  const code = (err as { code?: string } | null)?.code ?? '';

  switch (code) {
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'not-found':
      return 'The requested document could not be found.';
    case 'failed-precondition':
      return 'This feature needs a Firestore index that has not been created yet. Check the browser console for a link to create it.';
    case 'unavailable':
      return 'Firestore is currently unavailable. Please try again in a moment.';
    case 'deadline-exceeded':
      return 'The request timed out. Please try again.';
    case 'unauthenticated':
      return 'Your session has expired. Please sign in again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
