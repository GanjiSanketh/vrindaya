import { Injectable, signal, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AIService } from './ai.service';
import type { VisionAnalysisResult } from '../models/vision-analysis.model';

const ANALYSIS_PROMPT = `Analyze this product image and return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "category": "product category (e.g. Kurta, Saree, Lehenga, Top, Dress, etc.)",
  "fabric": "fabric type (e.g. Cotton, Silk, Georgette, Chiffon, etc.)",
  "colour": "dominant colour",
  "sleeve": "sleeve style (e.g. Full Sleeve, Half Sleeve, Sleeveless, 3/4 Sleeve, etc.)",
  "neck": "neck style (e.g. Round Neck, V-Neck, Collar, Mandarin, etc.)",
  "fit": "fit type (e.g. Regular, Slim, Oversized, Relaxed, etc.)",
  "length": "length description (e.g. Knee Length, Ankle Length, Mini, Midi, etc.)",
  "occasion": "suitable occasion (e.g. Casual, Formal, Party, Wedding, Festive, Daily Wear, etc.)",
  "season": "suitable season (e.g. Summer, Winter, Spring, Autumn, All Season, Festive, etc.)",
  "embroidery": "embroidery type or 'None'",
  "print": "print or pattern type or 'None'",
  "mirrorWork": "mirror work description or 'None'",
  "lace": "lace type or 'None'",
  "buttons": "button description or 'None'",
  "pockets": "pocket type or 'None' (e.g. Side Pockets, Flap Pockets, No Pockets, etc.)",
  "bottom": "bottom type or 'None'",
  "dupatta": "dupatta description or 'None'",
  "confidenceScore": 0.0 to 1.0
}`;

@Injectable({ providedIn: 'root' })
export class VisionAnalysisService {
  private readonly ai = inject(AIService);

  readonly history = signal<VisionAnalysisResult[]>([]);
  readonly analyzing = signal(false);
  readonly error = signal<string | null>(null);

  analyzeImages(imageUris: string[]): Observable<VisionAnalysisResult> {
    if (!imageUris.length) return throwError(() => new Error('No images provided'));
    if (!this.ai.isConfigured()) return throwError(() => new Error('AI provider not configured'));

    this.analyzing.set(true);
    this.error.set(null);

    const settings = this.ai.currentSettings();
    return this.ai.generate(ANALYSIS_PROMPT, {
      images: imageUris,
      model: settings.visionModel || settings.model || 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.1,
    }).pipe(
      map(r => {
        const parsed = this.parseResult(r.text, imageUris);
        const result: VisionAnalysisResult = {
          ...parsed,
          imageUrls: imageUris,
          rawResponse: r.text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.history.update(h => [result, ...h]);
        this.analyzing.set(false);
        return result;
      }),
      catchError(err => {
        this.analyzing.set(false);
        this.error.set(err.message || 'Analysis failed');
        return throwError(() => err);
      }),
    );
  }

  private parseResult(text: string, imageUris: string[]): VisionAnalysisResult {
    const base = { imageUrls: imageUris, createdAt: '', updatedAt: '' };
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const json = JSON.parse(cleaned);
      return {
        ...base,
        category: String(json.category ?? ''),
        fabric: String(json.fabric ?? ''),
        colour: String(json.colour ?? ''),
        sleeve: String(json.sleeve ?? ''),
        neck: String(json.neck ?? ''),
        fit: String(json.fit ?? ''),
        length: String(json.length ?? ''),
        occasion: String(json.occasion ?? ''),
        season: String(json.season ?? ''),
        embroidery: String(json.embroidery ?? ''),
        print: String(json.print ?? ''),
        mirrorWork: String(json.mirrorWork ?? ''),
        lace: String(json.lace ?? ''),
        buttons: String(json.buttons ?? ''),
        pockets: String(json.pockets ?? ''),
        bottom: String(json.bottom ?? ''),
        dupatta: String(json.dupatta ?? ''),
        confidenceScore: Number(json.confidenceScore ?? 0),
      };
    } catch {
      const lines = text.split('\n').map(l => l.replace(/^["\s]+|["\s,]+$/g, '')).filter(Boolean);
      return {
        ...base,
        category: lines[0] || '', fabric: lines[1] || '', colour: lines[2] || '',
        sleeve: lines[3] || '', neck: lines[4] || '', fit: lines[5] || '',
        length: lines[6] || '', occasion: lines[7] || '', season: lines[8] || '',
        embroidery: lines[9] || '', print: lines[10] || '', mirrorWork: lines[11] || '',
        lace: lines[12] || '', buttons: lines[13] || '', pockets: lines[14] || '',
        bottom: lines[15] || '', dupatta: lines[16] || '',
        confidenceScore: 0,
      };
    }
  }

  clearHistory(): void {
    this.history.set([]);
  }
}
