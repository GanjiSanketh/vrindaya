import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import crypto from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');
const SITE_URL = 'https://vrindaya.in';
const SITEMAP_CACHE_TTL_MS = 60 * 60_000; // 1 hour — a crawler hammering this shouldn't hammer the API

const app = express();
const angularApp = new AngularNodeAppEngine();

/* ───────────────────────────────────────────
 * AI Listing Studio — OpenAI pipeline
 * ─────────────────────────────────────────── */
const AI_CACHE_TTL_MS = 30 * 60_000; // 30 min
const aiCache = new Map<string, { data: unknown; expiresAt: number }>();

app.post('/api/ai/generate', express.json(), async (req, res) => {
  try {
    const { productName, marketplace, images } = req.body as {
      productName?: string;
      marketplace?: string;
      images?: { url: string }[];
    };

    if (!productName || typeof productName !== 'string') {
      res.status(400).json({ error: 'productName is required' });
      return;
    }

    // Cache key based on input
    const cacheKey = crypto.createHash('md5').update(JSON.stringify({ productName, marketplace, images })).digest('hex');
    const cached = aiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.data);
      return;
    }

    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });
      return;
    }

    // 1. Vision analysis if images provided
    let visionAnalysis = '';
    if (images && images.length > 0) {
      const imageContent = images.map(img => ({
        type: 'image_url' as const,
        image_url: { url: img.url, detail: 'low' as const },
      }));

      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this product image in detail. Describe: the product type, color, fabric appearance, pattern, style, fit, neck style, sleeve length, occasion suitability, and any visible design elements. Be specific and thorough.' },
              ...imageContent,
            ],
          }],
          max_tokens: 500,
        }),
      });

      if (!visionResponse.ok) {
        const errBody = await visionResponse.text();
      } else {
        const visionData = await visionResponse.json() as any;
        visionAnalysis = visionData.choices?.[0]?.message?.content ?? '';
      }
    }

    // 2. Generate all listing fields
    const systemPrompt = `You are an expert e-commerce product listing generator for Indian marketplaces (Amazon, Flipkart, Meesho, Ajio, Myntra). Generate a complete, optimized product listing in JSON format.

Product name: "${productName}"
Target marketplace: "${marketplace ?? 'general'}"
${visionAnalysis ? `Vision analysis of product images:\n${visionAnalysis}` : ''}

Respond with valid JSON (no markdown, no \`\`\`) using this exact schema:
{
  "analysis": "brief product analysis including market positioning, target audience, and differentiation",
  "title": "SEO-optimized product title (60-80 chars) including key attributes",
  "description": "rich product description with HTML paragraphs (200-400 words) covering what it is, key highlights, benefits, care instructions, and brand info",
  "keyFeatures": ["array of 5-8 compelling bullet-point features"],
  "fabric": "primary fabric/material",
  "fit": "fit type (e.g. Regular Fit, Slim Fit, A-Line, etc.)",
  "pattern": "pattern description (e.g. Solid, Printed, Geometric, etc.)",
  "occasion": "suitable occasion (e.g. Casual, Festive, Party Wear, Daily Wear, etc.)",
  "sleeve": "sleeve length/style (e.g. Three-Quarter Sleeve, Full Sleeve, Sleeveless, etc.)",
  "neck": "neck style (e.g. Round Neck, V-Neck, Mandarin Collar, etc.)",
  "careInstructions": "care instructions (e.g. Machine Wash Cold, Gentle Cycle, etc.)",
  "searchKeywords": ["array of 10-15 relevant search keywords and phrases in lowercase"],
  "specifications": [{"label": "Spec Name", "value": "Spec Value"}],
  "attributes": [{"name": "Attribute Name", "value": "Attribute Value"}],
  "flipkartAttributes": [{"label": "Flipkart Attribute", "value": "Value"}],
  "seo": {
    "metaTitle": "SEO meta title (50-60 chars)",
    "metaDescription": "SEO meta description (150-160 chars)",
    "focusKeyword": "primary focus keyword",
    "slug": "url-friendly-slug"
  },
  "imageSuggestions": [{"prompt": "detailed AI image generation prompt", "description": "brief description of the shot", "type": "shot type (e.g. Front View Model Shot)"}],
  "imageAltText": "descriptive alt text for the primary product image"
}`;

    const genResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a complete marketplace listing for "${productName}" on ${marketplace ?? 'general'}.` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!genResponse.ok) {
      const errBody = await genResponse.text();
      res.status(502).json({ error: 'OpenAI API request failed', detail: `Status ${genResponse.status}` });
      return;
    }

    const genData = await genResponse.json() as any;
    const raw = genData.choices?.[0]?.message?.content;
    if (!raw) {
      res.status(502).json({ error: 'OpenAI returned empty content' });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: 'Failed to parse OpenAI response as JSON' });
      return;
    }

    const result = {
      productName,
      marketplace: marketplace ?? 'general',
      analysis: parsed['analysis'] ?? '',
      title: parsed['title'] ?? '',
      description: parsed['description'] ?? '',
      keyFeatures: parsed['keyFeatures'] ?? [],
      fabric: parsed['fabric'] ?? '',
      fit: parsed['fit'] ?? '',
      pattern: parsed['pattern'] ?? '',
      occasion: parsed['occasion'] ?? '',
      sleeve: parsed['sleeve'] ?? '',
      neck: parsed['neck'] ?? '',
      careInstructions: parsed['careInstructions'] ?? '',
      searchKeywords: parsed['searchKeywords'] ?? [],
      specifications: parsed['specifications'] ?? [],
      attributes: parsed['attributes'] ?? [],
      flipkartAttributes: parsed['flipkartAttributes'] ?? [],
      seo: parsed['seo'] ?? { metaTitle: '', metaDescription: '', focusKeyword: '', slug: '' },
      imageSuggestions: parsed['imageSuggestions'] ?? [],
      imageAltText: parsed['imageAltText'] ?? '',
    };

    // Cache
    aiCache.set(cacheKey, { data: result, expiresAt: Date.now() + AI_CACHE_TTL_MS });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error during AI generation' });
  }
});

/**
 * XML sitemap — built at request time from the site's static routes plus
 * whatever's currently active in Categories/Collections/Policies, so it
 * never goes stale the way a build-time-generated file would. Each URL
 * includes lastmod (today's date), changefreq, and priority for crawler
 * guidance. Cached in-process for an hour.
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

    const staticPaths = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/new-arrivals', priority: '0.8', changefreq: 'weekly' },
      { path: '/trending', priority: '0.8', changefreq: 'weekly' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/wishlist', priority: '0.3', changefreq: 'monthly' },
    ];
    const dynamicPaths = [
      ...categories.map(c => ({ path: `/category/${c.id}`, priority: '0.8', changefreq: 'weekly' as const })),
      ...collections.map(c => ({ path: `/collection/${c.id}`, priority: '0.7', changefreq: 'weekly' as const })),
      ...brandConfig.policies.map(p => ({ path: `/policies/${p.id}`, priority: '0.5', changefreq: 'monthly' as const })),
    ];
    const today = new Date().toISOString().slice(0, 10);

    const urls = [...staticPaths, ...dynamicPaths]
      .map(p => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`)
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

  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
