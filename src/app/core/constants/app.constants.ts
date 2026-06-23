export const APP_NAME    = 'Vrindaya';
export const APP_TAGLINE = 'Wear the Grace';

export const STORAGE_KEYS = {
  WISHLIST:     'vrindaya_wishlist',
  POPUP_CONFIG: 'vrindaya_popup_config',
  POPUP_SHOWN:  'vrindaya_popup_shown',
} as const;

export const FLIPKART_CONFIG = {
  TARGET:   '_blank',
  REL:      'noopener,noreferrer',
} as const;

export const SCROLL_THRESHOLDS = {
  NAVBAR:       60,   /* px — navbar shadow kicks in */
  SCROLL_TOP:   600,  /* px — scroll-to-top button shows */
} as const;
