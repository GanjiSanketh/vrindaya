import { Injectable, inject } from '@angular/core';
import { Title, Meta }         from '@angular/platform-browser';
import { DOCUMENT }            from '@angular/common';

export interface SeoConfig {
  title?:       string;
  description?: string;
  keywords?:    string[];
  url?:         string;
  image?:       string;
  type?:        string;
  jsonLd?:      object | object[];
}

const SITE_URL  = 'https://vrindaya.in';
const SITE_NAME = 'Vrindaya';
const BASE_TITLE = 'Vrindaya — Wear the Grace | Premium Indian Ethnic Wear';
const BASE_DESC  = 'Discover premium Indian ethnic wear at Vrindaya — handpicked kurtas, kurta sets, sarees and more. Free delivery across India.';
const OG_IMAGE   = `${SITE_URL}/assets/logo/vrindaya-logo.png`;
const BRAND_KW   = ['vrindaya', 'indian ethnic wear', 'kurta', 'kurta set', 'ethnic wear online'];

const ORG_SCHEMA = {
  '@type': 'Organization',
  'name': 'Vrindaya',
  'url': SITE_URL,
  'logo': `${SITE_URL}/assets/logo/vrindaya-logo.png`,
  'contactPoint': {
    '@type': 'ContactPoint',
    'telephone': '+91 99999 99999',
    'contactType': 'customer service',
    'availableLanguage': ['English', 'Hindi'],
  },
};

const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  'name': SITE_NAME,
  'url': SITE_URL,
  'potentialAction': {
    '@type': 'SearchAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': `${SITE_URL}/shop?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const BASE_SCHEMAS = [ORG_SCHEMA, WEBSITE_SCHEMA];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleSvc = inject(Title);
  private readonly meta     = inject(Meta);
  private readonly doc      = inject(DOCUMENT);

  setPage(config: SeoConfig): void {
    const title   = config.title ? `${config.title} | ${SITE_NAME}` : BASE_TITLE;
    const desc    = config.description ?? BASE_DESC;
    const imgUrl  = config.image ? this.abs(config.image) : OG_IMAGE;
    const pageUrl = config.url   ? `${SITE_URL}${config.url}` : SITE_URL;
    const keywords = [...(config.keywords ?? []), ...BRAND_KW].join(', ');

    this.titleSvc.setTitle(title);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ name: 'keywords',    content: keywords });
    this.meta.updateTag({ name: 'robots',      content: 'index, follow' });
    this.meta.updateTag({ name: 'author',      content: SITE_NAME });
    this.meta.updateTag({ name: 'theme-color', content: '#0f6f84' });
    this.meta.updateTag({ name: 'HandheldFriendly', content: 'True' });
    this.meta.updateTag({ name: 'MobileOptimized', content: '320' });
    this.meta.updateTag({ name: 'referrer', content: 'no-referrer-when-downgrade' });

    this.meta.updateTag({ property: 'og:type',        content: config.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name',   content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title',       content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:image',       content: imgUrl });
    this.meta.updateTag({ property: 'og:url',         content: pageUrl });
    this.meta.updateTag({ property: 'og:locale',      content: 'en_IN' });

    this.meta.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',       content: title });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
    this.meta.updateTag({ name: 'twitter:image',       content: imgUrl });

    this.setCanonical(pageUrl);
    this.setJsonLd(config.jsonLd);
  }

  breadcrumb(items: { name: string; url: string }[]): object {
    const itemListElement = items.map((item, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': item.name,
      'item': `${SITE_URL}${item.url}`,
    }));
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': itemListElement,
    };
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(pageSchemas: object | object[] | undefined): void {
    const extra = Array.isArray(pageSchemas) ? pageSchemas : (pageSchemas ? [pageSchemas] : []);
    const graph = [...BASE_SCHEMAS, ...extra];
    const data = { '@context': 'https://schema.org', '@graph': graph };

    let script = this.doc.getElementById('ld-json') as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'ld-json');
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private abs(path: string): string {
    return path.startsWith('http') ? path : `${SITE_URL}/${path.replace(/^\//, '')}`;
  }
}
