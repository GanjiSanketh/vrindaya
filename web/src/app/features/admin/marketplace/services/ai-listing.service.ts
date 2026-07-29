import { Injectable, signal, inject } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, catchError, tap, map, timeout } from 'rxjs/operators';
import { AIService } from './ai.service';
import type { GenerateResponse } from './ai/iai-provider';

export interface ListingInput {
  name: string;
  brand: string;
  category: string;
  description: string;
  platform: string;
  targetPrice: number;
  targetStock: number;
}

export interface GeneratedContent {
  title: string;
  description: string;
  highlights: string[];
  seoKeywords: string[];
  fabric: string;
  fit: string;
  sleeve: string;
  pattern: string;
  neck: string;
  occasion: string;
  care: string[];
  marketplaceAttributes: { label: string; value: string }[];
  imageAltText: string;
}

export interface ContentVersion {
  id: string;
  content: GeneratedContent;
  input: ListingInput;
  provider: string;
  model: string;
  createdAt: string;
}

const PARSE = {
  lines(str: string): string[] { return str.split('\n').map(s => s.replace(/^[-*\d.]+/, '').trim()).filter(Boolean); },
  csv(str: string): string[] { return str.split(',').map(s => s.trim()).filter(Boolean); },
  attrs(str: string): { label: string; value: string }[] { return str.split('\n').map(l => { const m = l.match(/^(.+?)[:\-](.+)/); return m ? { label: m[1].trim(), value: m[2].trim() } : null; }).filter(Boolean) as any; },
  firstLine(str: string): string { return str.split('\n')[0].trim(); },
};

@Injectable({ providedIn: 'root' })
export class AITestingService {
  private readonly ai = inject(AIService);

  private cache = new Map<string, { data: GenerateResponse; ts: number }>();
  private readonly CACHE_TTL = 300_000;
  private readonly TIMEOUT = 30_000;
  private readonly MAX_RETRIES = 2;

  readonly versions = signal<ContentVersion[]>([]);

  /** Tracks the last prompt text used for any generation. */
  readonly lastPrompt = signal('');

  private generate(prompt: string): Observable<GenerateResponse> {
    this.lastPrompt.set(prompt);
    const cached = this.cache.get(prompt);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return of(cached.data);

    return this.ai.generate(prompt).pipe(
      timeout(this.TIMEOUT),
      retryWhen(err$ => err$.pipe(
        mergeMap((err, i) => i < this.MAX_RETRIES ? timer(1000 * (i + 1)) : throwError(() => err)),
      )),
      catchError(err => {
        const msg = err.message || 'Generation failed';
        return throwError(() => new Error(msg));
      }),
      tap(res => this.cache.set(prompt, { data: res, ts: Date.now() })),
    );
  }

  private genText(prompt: string): Observable<string> { return this.generate(prompt).pipe(map(r => r.text)); }

  private buildPrompt(system: string, input: ListingInput): string {
    return `${system}

Product Information:
- Name: ${input.name}
- Brand: ${input.brand}
- Category: ${input.category}
- Description: ${input.description}
- Platform: ${input.platform}
- Target Price: ₹${input.targetPrice}
- Target Stock: ${input.targetStock}

Return only the requested content. No explanations. No markdown.`;
  }

  generateTitle(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Generate a compelling e-commerce product title (max 10 words). Return only the title.', input)).pipe(map(PARSE.firstLine));
  }

  generateDescription(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Write a persuasive product description (2-3 paragraphs) for an e-commerce listing. Include key features, benefits, and brand story. Return only the description.', input));
  }

  generateHighlights(input: ListingInput): Observable<string[]> {
    return this.genText(this.buildPrompt('Generate 5 bullet-point highlights. Start each with "-".', input)).pipe(map(PARSE.lines));
  }

  generateSeoKeywords(input: ListingInput): Observable<string[]> {
    return this.genText(this.buildPrompt('Generate 10 SEO keywords as a comma-separated list.', input)).pipe(map(PARSE.csv));
  }

  generateFabric(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the fabric/material name most suitable for this product category. Single word.', input)).pipe(map(PARSE.firstLine));
  }

  generateFit(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the fit type (e.g. Regular, Slim, Oversized, Relaxed) for this product. Single word.', input)).pipe(map(PARSE.firstLine));
  }

  generateSleeve(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the sleeve style (e.g. Full Sleeve, Half Sleeve, Sleeveless, 3/4 Sleeve). 1-3 words.', input)).pipe(map(PARSE.firstLine));
  }

  generatePattern(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the pattern/design (e.g. Solid, Striped, Floral, Geometric, Printed) for this product. Single word.', input)).pipe(map(PARSE.firstLine));
  }

  generateNeck(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the neck style (e.g. Round Neck, V-Neck, Collar, Hoodie, Mandarin) for this product. 1-3 words.', input)).pipe(map(PARSE.firstLine));
  }

  generateOccasion(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Return only the best-suited occasion (e.g. Casual, Formal, Party, Wedding, Daily Wear) for this product. Single word.', input)).pipe(map(PARSE.firstLine));
  }

  generateCare(input: ListingInput): Observable<string[]> {
    return this.genText(this.buildPrompt('Generate 4 care instructions. Start each with "-".', input)).pipe(map(PARSE.lines));
  }

  generateMarketplaceAttributes(input: ListingInput): Observable<{ label: string; value: string }[]> {
    return this.genText(this.buildPrompt('Generate 6 product attributes in "Label: Value" format, one per line. Example: "Material: Cotton".', input)).pipe(map(PARSE.attrs));
  }

  generateImageAltText(input: ListingInput): Observable<string> {
    return this.genText(this.buildPrompt('Generate a descriptive image alt text (max 15 words) for the primary product image. Return only the alt text.', input)).pipe(map(PARSE.firstLine));
  }

  generateEverything(input: ListingInput): Observable<GeneratedContent> {
    return this.generate(this.buildPrompt(`Generate complete e-commerce listing content for the product below. Return ONLY in this exact format:

TITLE: <title>
DESCRIPTION: <2-3 paragraph description>
HIGHLIGHTS:
- <highlight 1>
- <highlight 2>
- <highlight 3>
- <highlight 4>
- <highlight 5>
SEO KEYWORDS: <keyword1>, <keyword2>, ... (10 keywords)
FABRIC: <fabric>
FIT: <fit>
SLEEVE: <sleeve>
PATTERN: <pattern>
NECK: <neck>
OCCASION: <occasion>
CARE:
- <care 1>
- <care 2>
- <care 3>
- <care 4>
ATTRIBUTES:
<label 1>: <value 1>
<label 2>: <value 2>
ALT TEXT: <alt text>`, input)).pipe(
      map(r => {
        const s = r.text;
        const sec = (label: string) => { const m = s.match(new RegExp(`${label}[:\\s]*([^\\n]*(\\n[\\s]*-[^\\n]*)*)`, 'i')); return m ? m[1].trim() : ''; };
        const lines = (label: string) => sec(label).split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
        const csv = (label: string) => sec(label).split(',').map(s => s.trim()).filter(Boolean);
        return {
          title: sec('TITLE'),
          description: s.match(/DESCRIPTION:\s*((?:.|\n)*?)(?=HIGHLIGHTS|SEO KEYWORDS)/i)?.[1]?.trim() || '',
          highlights: lines('HIGHLIGHTS'),
          seoKeywords: csv('SEO KEYWORDS'),
          fabric: sec('FABRIC'),
          fit: sec('FIT'),
          sleeve: sec('SLEEVE'),
          pattern: sec('PATTERN'),
          neck: sec('NECK'),
          occasion: sec('OCCASION'),
          care: lines('CARE'),
          marketplaceAttributes: s.match(/ATTRIBUTES:[\s\S]*?(?=ALT TEXT)/i)?.[0]?.split('\n').slice(1).filter(Boolean).map(l => { const m = l.match(/^(.+?):\s*(.+)/); return m ? { label: m[1].trim(), value: m[2].trim() } : null; }).filter(Boolean) as any || [],
          imageAltText: sec('ALT TEXT'),
        } as GeneratedContent;
      }),
    );
  }

  saveVersion(content: GeneratedContent, input: ListingInput): void {
    const s = this.ai.currentSettings();
    this.versions.update(v => [{
      id: crypto.randomUUID(),
      content: JSON.parse(JSON.stringify(content)),
      input: JSON.parse(JSON.stringify(input)),
      provider: s.provider,
      model: s.model,
      createdAt: new Date().toISOString(),
    }, ...v]);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
