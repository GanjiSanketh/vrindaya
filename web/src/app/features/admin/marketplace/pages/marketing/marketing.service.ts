import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AIService } from '../../services/ai.service';
import type { MarketingCampaign } from './models/marketing-campaign.model';

export interface GenerateResult {
  text: string;
  model: string;
}

export interface ToneOption {
  value: string;
  label: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'trendy', label: 'Trendy & Youthful' },
  { value: 'elegant', label: 'Elegant & Poetic' },
];

const STORAGE_KEY = 'vrindaya_marketing_campaigns';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly ai = inject(AIService);
  readonly campaigns = signal<MarketingCampaign[]>([]);

  constructor() {
    this.load();
  }

  isReady(): boolean {
    return this.ai.isConfigured();
  }

  private unwrap(result: Observable<{ text: string; model: string }>): Observable<GenerateResult> {
    return result.pipe(
      map(r => ({ text: r.text, model: r.model })),
      catchError(err => { throw err; }),
    );
  }

  generateInstagramPost(productName: string, productDesc: string, tone: string, emojis = true, hashtags = true): Observable<GenerateResult> {
    const prompt = `Write an Instagram post for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: catchy caption, 3-5 relevant hashtags, engagement question. Emojis: ${emojis ? 'use tasteful emojis' : 'no emojis'}. Hashtags: ${hashtags ? 'include 5 relevant hashtags' : 'no hashtags'}. Keep it under 2200 characters.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateInstagramReel(productName: string, productDesc: string, tone: string, audience = ''): Observable<GenerateResult> {
    const prompt = `Write an Instagram Reel script for "${productName}". Description: ${productDesc}. Tone: ${tone}. Target audience: ${audience || 'general'}. Include: hook (first 3 sec), visual directions, text overlay ideas, audio suggestion, CTA. Keep under 60 seconds script.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateFacebookPost(productName: string, productDesc: string, tone: string, hashtags = true, cta = 'Shop Now'): Observable<GenerateResult> {
    const prompt = `Write a Facebook post for "${productName}". Description: ${productDesc}. Tone: ${tone}. Hashtags: ${hashtags ? 'include 3 relevant hashtags' : 'no hashtags'}. Primary CTA: ${cta}. Include: engaging headline, body text (2-3 paragraphs), CTA. Keep it conversational and shareable.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generatePinterestPin(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write a Pinterest pin for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: SEO-optimized title (max 100 chars), description (max 500 chars) with keywords, 5 board name suggestions, hashtags.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateWhatsAppCatalog(productName: string, productDesc: string, tone: string, cta = 'Shop Now'): Observable<GenerateResult> {
    const prompt = `Write a WhatsApp catalog entry for "${productName}". Description: ${productDesc}. Tone: ${tone}. Primary CTA: ${cta}. Include: short product name (max 30 chars), description (max 1000 chars), price display suggestion, CTA button text.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateCaption(productName: string, productDesc: string, tone: string, emojis = true): Observable<GenerateResult> {
    const prompt = `Write a short caption for "${productName}". Description: ${productDesc}. Tone: ${tone}. Emojis: ${emojis ? 'use tasteful emojis' : 'no emojis'}. Keep it under 150 characters. Make it punchy and memorable.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateBlog(productName: string, productDesc: string, tone: string, audience: string, length: string, keywords: string): Observable<GenerateResult> {
    const prompt = `Write a blog article draft for "${productName}". Description: ${productDesc}. Tone: ${tone}. Target audience: ${audience || 'general'}. Length: ${length}. Custom keywords: ${keywords || 'none'}. Include: search-friendly title, intro, 3-5 H2 sections with hooks, product highlights, styling tips, conclusion, CTA, meta description.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateFlipkart(productName: string, productDesc: string, tone: string, cta: string, keywords: string): Observable<GenerateResult> {
    const prompt = `Write a Flipkart product description for "${productName}". Description: ${productDesc}. Tone: ${tone}. Primary CTA: ${cta}. Custom keywords: ${keywords || 'none'}. Include: compelling title (max 70 chars), short description (2-3 lines), bullet-point feature list (6-8), key highlights box, search keywords, care instructions note.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateLanding(productName: string, productDesc: string, tone: string, audience: string, heading: string, length: string, cta: string, keywords: string): Observable<GenerateResult> {
    const prompt = `Write website landing page copy for "${productName}". Description: ${productDesc}. Tone: ${tone}. Target audience: ${audience || 'general'}. Length: ${length}. Primary CTA: ${cta}. Custom keywords: ${keywords || 'none'}. Structure: attention headline (${heading || 'auto-generated'}), subheadline, 3 benefit sections, proof/social signals, urgency note, final CTA button text.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateEmail(productName: string, productDesc: string, tone: string, subject: string, audience: string, length: string, cta: string): Observable<GenerateResult> {
    const prompt = `Write a marketing email for "${productName}". Description: ${productDesc}. Tone: ${tone}. Target audience: ${audience || 'general'}. Length: ${length}. Primary CTA: ${cta}. Include: subject line (${subject || 'auto-generated'}), preview text, personalized greeting, opening hook, 2-3 value points, offer/benefit, single CTA button, closing P.S.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateHashtags(productName: string, productDesc: string): Observable<GenerateResult> {
    const prompt = `Generate 15 hashtags for "${productName}". Description: ${productDesc}. Include: 5 broad fashion hashtags, 5 niche/occasion-specific, 5 branded/Vrindaya hashtags. Format: each on new line with # prefix.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateSEO(productName: string, productDesc: string, keywords: string): Observable<GenerateResult> {
    const prompt = `Generate SEO metadata for "${productName}". Description: ${productDesc}. Custom keywords: ${keywords}. Include: meta title (max 60 chars), meta description (max 160 chars), focus keyword, 10 secondary keywords, URL slug suggestion.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  saveCampaign(c: Omit<MarketingCampaign, 'id' | 'createdAt'>): void {
    const entry: MarketingCampaign = { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.campaigns.update(list => [entry, ...list]);
    this.persist();
  }

  deleteCampaign(id: string): void {
    this.campaigns.update(list => list.filter(c => c.id !== id));
    this.persist();
  }

  clearHistory(): void {
    this.campaigns.set([]);
    this.persist();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.campaigns.set(JSON.parse(raw));
    } catch { /* ignore */ }
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.campaigns())); } catch { /* ignore */ }
  }
}
