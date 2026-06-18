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
  {
    path:       '**',
    renderMode: RenderMode.Prerender,
  },
];
