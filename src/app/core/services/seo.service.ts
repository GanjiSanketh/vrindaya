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
  jsonLd?:      object;
}

const SITE_URL  = 'https://vrindaya.in';
const SITE_NAME = 'Vrindaya';
const BASE_TITLE = 'Vrindaya — Wear the Grace | Premium Indian Ethnic Wear';
const BASE_DESC  = 'Discover premium Indian ethnic wear at Vrindaya — handpicked kurtas, kurta sets, sarees and more. Free delivery across India.';
const OG_IMAGE   = `${SITE_URL}/assets/logo/vrindaya-logo.png`;
const BRAND_KW   = ['vrindaya', 'indian ethnic wear', 'kurta', 'kurta set', 'ethnic wear online'];

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

    // Open Graph
    this.meta.updateTag({ property: 'og:type',        content: config.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name',   content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title',       content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:image',       content: imgUrl });
    this.meta.updateTag({ property: 'og:url',         content: pageUrl });
    this.meta.updateTag({ property: 'og:locale',      content: 'en_IN' });

    // Twitter Cards
    this.meta.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',       content: title });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
    this.meta.updateTag({ name: 'twitter:image',       content: imgUrl });

    this.setCanonical(pageUrl);
    if (config.jsonLd) this.setJsonLd(config.jsonLd);
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

  private setJsonLd(data: object): void {
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
