/** Mirrors the backend's Vrindaya.Api.Constants.LifecycleStage — exact spelling is load-bearing (round-trips to Firestore verbatim). Keep both sides in sync. */
export const LIFECYCLE_STAGES = [
  'Draft',
  'Photography Pending',
  'Photography Complete',
  'Image Editing Complete',
  'Ready For Website',
  'Published On Website',
  'Ready For Flipkart',
  'Listed On Flipkart',
  'Sold Out',
  'Archived',
] as const;

export type LifecycleStageValue = typeof LIFECYCLE_STAGES[number];
