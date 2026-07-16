import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';

const browserDistFolder = join(import.meta.dirname, '../browser');
const SITE_URL = 'https://vrindaya.in';
const SITEMAP_CACHE_TTL_MS = 60 * 60_000; // 1 hour — a crawler hammering this shouldn't hammer the API

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * XML sitemap — built at request time from the site's static routes plus
 * whatever's currently active in Categories/Collections/Policies, so it
 * never goes stale the way a build-time-generated file would. There's no
 * standalone product-detail route in this discovery-site architecture
 * (products only render inside category/collection listings), so no
 * per-product URLs are included. Cached in-process for an hour.
 */
let sitemapCache: { xml: string; expiresAt: number } | null = null;

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    if (sitemapCache && sitemapCache.expiresAt > Date.now()) {
      res.type('application/xml').send(sitemapCache.xml);
      return;
    }

    const [categories, collections, brandConfig] = await Promise.all([
      fetchJson<{ id: string }[]>(`${environment.apiBaseUrl}/categories`, []),
      fetchJson<{ id: string }[]>(`${environment.apiBaseUrl}/collections`, []),
      fetchJson<{ policies: { id: string }[] }>(`${environment.apiBaseUrl}/brand-config`, { policies: [] }),
    ]);

    const staticPaths = ['/', '/new-arrivals', '/trending', '/about', '/contact', '/faq'];
    const dynamicPaths = [
      ...categories.map(c => `/category/${c.id}`),
      ...collections.map(c => `/collection/${c.id}`),
      ...brandConfig.policies.map(p => `/policies/${p.id}`),
    ];

    const urls = [...staticPaths, ...dynamicPaths]
      .map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`)
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

    sitemapCache = { xml, expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS };
    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
});

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
