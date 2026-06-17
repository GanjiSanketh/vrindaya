export const APP_ROUTES = {
  HOME:         '',
  CATEGORY:     'category',
  NEW_ARRIVALS: 'new-arrivals',
  TRENDING:     'trending',
  ADMIN:        'admin',
  POPUP_CONFIG: 'admin/popup-config',
  NOT_FOUND:    'not-found',
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/* Category IDs — single source of truth */
export const CATEGORY_IDS = {
  LONG_KURTAS:   'long-kurtas',
  SHORT_KURTAS:  'short-kurtas',
  TWO_PIECE:     '2-piece-sets',
  THREE_PIECE:   '3-piece-sets',
} as const;
