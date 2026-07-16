import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  /* ── Admin portal: browser-only (auth + localStorage) ── */
  {
    path:       'admin/**',
    renderMode: RenderMode.Client,
  },

  /* ── Public routes: prerendered at build time ── */
  {
    path: 'category/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => [
      { id: 'long-kurtas'  },
      { id: 'short-kurtas' },
      { id: '2-piece-sets' },
      { id: '3-piece-sets' },
    ],
  },
  {
    path:       'new-arrivals',
    renderMode: RenderMode.Prerender,
  },
  {
    path:       'trending',
    renderMode: RenderMode.Prerender,
  },

  /* ── Admin-curated dynamic slugs — server-rendered per request rather
     than prerendered at build time, since Collections/Policies are added
     via the CMS without a rebuild (same reasoning as category/:id would
     need if categories ever stopped being a fixed, hardcoded list). ── */
  {
    path:       'collection/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path:       'policies/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path:       'product/:id',
    renderMode: RenderMode.Server,
  },

  {
    path:       '**',
    renderMode: RenderMode.Prerender,
  },
];
