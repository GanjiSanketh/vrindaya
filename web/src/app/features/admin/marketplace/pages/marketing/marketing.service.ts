import { Injectable, signal, inject } from '@angular/core';
import { Observable, isObservable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AIService } from '../../services/ai.service';
import type { GenerateOptions } from '../../services/ai/iai-provider';
import type { MarketingCampaign, MarketingTool } from './models/marketing-campaign.model';

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

  generateInstagramPost(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write an Instagram post for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: catchy caption, 3-5 relevant hashtags, engagement question. Keep it under 2200 characters.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateInstagramReel(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write an Instagram Reel script for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: hook (first 3 sec), visual directions, text overlay ideas, audio suggestion, CTA. Keep under 60 seconds script.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateFacebookPost(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write a Facebook post for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: engaging headline, body text (2-3 paragraphs), 3 hashtags, CTA. Keep it conversational and shareable.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generatePinterestPin(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write a Pinterest pin for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: SEO-optimized title (max 100 chars), description (max 500 chars) with keywords, 5 board name suggestions, hashtags.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateWhatsAppCatalog(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write a WhatsApp catalog entry for "${productName}". Description: ${productDesc}. Tone: ${tone}. Include: short product name (max 30 chars), description (max 1000 chars), price display suggestion, CTA button text.`;
    return this.unwrap(this.ai.generate(prompt));
  }

  generateCaption(productName: string, productDesc: string, tone: string): Observable<GenerateResult> {
    const prompt = `Write a short caption for "${productName}". Description: ${productDesc}. Tone: ${tone}. Keep it under 150 characters. Make it punchy and memorable. Include emojis if appropriate.`;
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
