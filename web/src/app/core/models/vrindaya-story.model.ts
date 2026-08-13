/**
 * Vrindaya Story configuration — the CMS-driven brand storytelling section,
 * shared by the storefront (Firestore read of homepageConfig/active.
 * vrindayaStory) and the admin management screen (API read/write). When no
 * configuration has been saved yet, the storefront falls back to its built-in
 * defaults, so the section keeps working until the first admin save.
 * Timestamps are ISO-8601 strings.
 */
export interface VrindayaStoryConfig {
  items: VrindayaStoryItem[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** CSS object-position keyword — controls where the model sits in the frame. */
export type VrindayaStoryPosition = 'top' | 'center' | 'bottom' | 'left' | 'right';

/** The built-in story content — seeded into the admin screen and rendered by the storefront until an admin configuration is published. */
export interface VrindayaStoryDefaultItem {
  storyId: string;
  storyNumber: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: VrindayaStoryPosition;
}

export const DEFAULT_VRINDAYA_STORY_ITEMS: VrindayaStoryDefaultItem[] = [
  {
    storyId: 'story-1',
    storyNumber: '01',
    title: 'Rooted in heritage',
    description:
      'Every Vrindaya silhouette begins with the craft traditions of Indian textile houses — block prints, hand looms and drape — studied, then quietly reimagined for the way you live today.',
    imageUrl: 'assets/hero/hero-banner-2.png',
    imageAlt: 'Vrindaya heritage craft',
    imagePosition: 'center',
  },
  {
    storyId: 'story-2',
    storyNumber: '02',
    title: 'Fabrics that breathe',
    description:
      'Cotton and georgette are chosen by hand, garment by garment, for their weight, drape and colour depth. Soft to the touch, composed on the body, season after season.',
    imageUrl: 'assets/hero/hero-banner-3.png',
    imageAlt: 'Vrindaya fabrics in motion',
    imagePosition: 'center',
  },
  {
    storyId: 'story-3',
    storyNumber: '03',
    title: 'Designed to be lived in',
    description:
      'From quiet mornings to grand evenings, the collection moves with you — considered silhouettes that feel as graceful at a desk as they do at a celebration.',
    imageUrl: 'assets/hero/hero-banner-4.png',
    imageAlt: 'Vrindaya modern ethnic wear',
    imagePosition: 'center',
  },
];

export const VRINDAYA_STORY_POSITIONS: VrindayaStoryPosition[] = [
  'top',
  'center',
  'bottom',
  'left',
  'right',
];

/** One brand-story beat (heritage, fabric, silhouette...). */
export interface VrindayaStoryItem {
  /** Stable id (story-1, story-2, ...) used as the track key + defaults lookup. */
  storyId: string;
  /** Editorial index, e.g. "01". */
  storyNumber: string;
  title: string;
  description: string;
  /** Cloudinary secure URL of the story image. */
  imageUrl: string;
  imageAlt: string;
  /** object-position keyword — "center" when unset. */
  imagePosition: VrindayaStoryPosition;
  /** 1-based position; reassigned on every admin save. */
  displayOrder: number;
  /** Inactive beats are kept in the config but never rendered. */
  isActive: boolean;
  /** Cloudinary public id (vrindaya-story/items/...) — used to delete/replace. */
  storagePath: string;
  createdAt: string;
  updatedAt: string;
}

/** Full-state overwrite payload sent to PUT /homepage-config/vrindaya-story. */
export interface VrindayaStorySavePayload {
  items: VrindayaStoryItemSavePayload[];
}

/** One story beat in a save payload. */
export interface VrindayaStoryItemSavePayload {
  storyId: string;
  storyNumber: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: VrindayaStoryPosition;
  displayOrder: number;
  isActive: boolean;
  storagePath: string;
}

/** A single uploaded story image, before it is persisted to Firestore. */
export interface VrindayaStoryUploadedImage {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  sizeBytes: number;
}
