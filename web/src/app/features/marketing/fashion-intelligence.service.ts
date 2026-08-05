import { Injectable, signal } from '@angular/core';
import {
  CLASSIFICATION_KEYS,
  ClassificationResult,
  ProductClassification,
  ProductInput,
  defaultProductInput,
} from '../models/fashion-intelligence.model';

const STORAGE_KEY = 'vrindaya_fashion_intelligence_history';

const OCCASION_KEYWORDS: Record<string, string[]> = {
  Wedding: ['wedding', 'bridal', 'marriage', 'shaadi', 'lehenga', 'sherwani'],
  Festival: ['festival', 'diwali', 'navratri', 'durga puja', 'eid', 'festive', 'celebration'],
  Office: ['office', 'work', 'formal', 'business', 'corporate', 'meeting', 'professional'],
  Casual: ['casual', 'daily', 'everyday', 'casual wear', 'comfort', 'relaxed'],
  Party: ['party', 'cocktail', 'evening', 'celebration', 'dinner', 'soiree'],
  Bridal: ['bridal', 'bride', 'wedding day', 'marriage ceremony'],
  Haldi: ['haldi', 'pithi', 'turmeric ceremony', 'pre-wedding'],
  Mehndi: ['mehndi', 'henna', 'mehendi ceremony'],
  Reception: ['reception', 'wedding reception', 'post wedding'],
  Sangeet: ['sangeet', 'music ceremony', 'pre-wedding function'],
};

const SEASON_KEYWORDS: Record<string, string[]> = {
  Spring: ['spring', 'floral', 'pastel', 'light', 'bloom', 'fresh'],
  Summer: ['summer', 'cotton', 'linen', 'lightweight', 'breathable', 'cool'],
  Autumn: ['autumn', 'fall', 'warm', 'earth', 'layering', 'transition'],
  Winter: ['winter', 'wool', 'velvet', 'heavy', 'warm', 'cozy', 'layer'],
  'All Season': ['all season', 'versatile', 'year-round', 'any season'],
};

const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  Brides: ['bridal', 'bride', 'wedding', 'marriage', 'trousseau'],
  'Working Women': ['office', 'work', 'professional', 'corporate', 'career', 'business'],
  'College Students': ['college', 'student', 'youth', 'young', 'campus', 'budget'],
  'Festival Shoppers': ['festival', 'festive', 'celebration', 'traditional', 'ethnic'],
  'Luxury Buyers': ['luxury', 'premium', 'designer', 'exclusive', 'high-end', 'couture'],
  'Mature Women': ['mature', 'elegant', 'sophisticated', 'classic', 'timeless', 'graceful'],
};

const FABRIC_KEYWORDS: Record<string, string[]> = {
  Silk: ['silk', 'mulberry', 'tussar', 'kanchipuram', 'banarasi silk'],
  Cotton: ['cotton', 'handloom', 'khaddar', 'organic cotton'],
  Chiffon: ['chiffon', 'georgette chiffon', 'lightweight'],
  Georgette: ['georgette', 'faux georgette', 'pure georgette'],
  Velvet: ['velvet', 'crushed velvet', 'panne velvet'],
  Organza: ['organza', 'silk organza', 'embroidered organza'],
  Linen: ['linen', 'irish linen', 'european linen'],
  Brocade: ['brocade', 'zari brocade', 'gold brocade'],
  Banarasi: ['banarasi', 'banaras', 'katan', 'tanchoi'],
  Chanderi: ['chanderi', 'chanderi silk', 'cotton silk'],
};

const PRINT_KEYWORDS: Record<string, string[]> = {
  Floral: ['floral', 'flower', 'botanical', 'rose', 'lotus', 'bloom'],
  Geometric: ['geometric', 'shape', 'pattern', 'angular', 'symmetry'],
  Abstract: ['abstract', 'artistic', 'modern art', 'expressionist'],
  Traditional: ['traditional', 'heritage', 'classic', 'ethnic', 'motif'],
  Solid: ['solid', 'plain', 'single color', 'no print'],
  Embroidered: ['embroidered', 'embroidery', 'threadwork', 'zardozi', 'aari'],
  Bandhani: ['bandhani', 'bandhej', 'tie dye', 'leheriya'],
  Leheriya: ['leheriya', 'laheriya', 'wave pattern'],
  Ikat: ['ikat', 'patola', 'double ikat'],
  'Block Print': ['block print', 'hand block', 'ajrakh', 'dabu'],
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  Reds: ['red', 'maroon', 'burgundy', 'crimson', 'ruby', 'wine', 'scarlet'],
  Blues: ['blue', 'navy', 'teal', 'turquoise', 'azure', 'indigo', 'cobalt'],
  Greens: ['green', 'emerald', 'olive', 'mint', 'sage', 'forest', 'lime'],
  Yellows: ['yellow', 'mustard', 'gold', 'amber', 'ochre', 'sunshine'],
  Pinks: ['pink', 'rose', 'blush', 'magenta', 'fuchsia', 'salmon', 'coral'],
  Purples: ['purple', 'violet', 'lavender', 'plum', 'amethyst', 'lilac', 'mauve'],
  Oranges: ['orange', 'peach', 'apricot', 'terracotta', 'rust', 'coral'],
  Neutrals: ['beige', 'cream', 'ivory', 'taupe', 'grey', 'gray', 'charcoal', 'white', 'black'],
  Metallics: ['gold', 'silver', 'bronze', 'copper', 'metallic', 'shimmer', 'zari'],
  Pastels: ['pastel', 'soft', 'pale', 'light', 'muted', 'powder', 'baby'],
};

function matchKeywords(text: string, keywords: Record<string, string[]>): { label: string; score: number } {
  const lower = text.toLowerCase();
  let bestMatch = { label: '', score: 0 };

  for (const [label, words] of Object.entries(keywords)) {
    let score = 0;
    for (const word of words) {
      if (lower.includes(word.toLowerCase())) {
        score += word.length;
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { label, score };
    }
  }
  return bestMatch;
}

function calculateScore(base: number, modifiers: number[]): number {
  const score = base + modifiers.reduce((a, b) => a + b, 0);
  return Math.min(100, Math.max(0, Math.round(score)));
}

@Injectable({ providedIn: 'root' })
export class FashionIntelligenceService {
  readonly history = signal<ProductClassification[]>([]);

  private load(): ProductClassification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProductClassification[];
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch { /* ignore */ }
    return [];
  }

  constructor() {
    this.history.set(this.load());
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history())); } catch { /* ignore */ }
  }

  classify(product: ProductInput): ClassificationResult[] {
    const text = `${product.name} ${product.category} ${product.description} ${product.tags.join(' ')}`.toLowerCase();

    const occasion = matchKeywords(text, OCCASION_KEYWORDS);
    const season = matchKeywords(text, SEASON_KEYWORDS);
    const audience = matchKeywords(text, AUDIENCE_KEYWORDS);
    const fabricStyle = matchKeywords(text, FABRIC_KEYWORDS);
    const printType = matchKeywords(text, PRINT_KEYWORDS);
    const colorFamily = matchKeywords(text, COLOR_KEYWORDS);

    const priceFactor = product.price > 50000 ? 20 : product.price > 20000 ? 10 : product.price > 10000 ? 5 : 0;
    const tagCount = product.tags.length * 2;

    const trendingBase = 50 + (occasion.score || 0) * 0.5 + (season.score || 0) * 0.3 + tagCount;
    const luxuryBase = 40 + priceFactor + (fabricStyle.score || 0) * 0.4 + (occasion.label === 'Bridal' ? 20 : occasion.label === 'Wedding' ? 15 : 0);
    const officeBase = 30 + (occasion.label === 'Office' ? 40 : 0) + (audience.label === 'Working Women' ? 20 : 0) + (fabricStyle.label === 'Cotton' ? 10 : fabricStyle.label === 'Linen' ? 10 : 0);
    const festivalBase = 35 + (occasion.label === 'Festival' ? 35 : occasion.label.includes('Haldi') || occasion.label.includes('Mehndi') || occasion.label.includes('Sangeet') ? 25 : 0) + (fabricStyle.label === 'Silk' ? 15 : fabricStyle.label === 'Velvet' ? 10 : 0) + (colorFamily.label === 'Reds' ? 10 : colorFamily.label === 'Metallics' ? 10 : 0);

    const results = CLASSIFICATION_KEYS.map(def => {
      let value = '';
      let score = 0;
      let confidence = 75;
      let reasoning = '';

      switch (def.key) {
        case 'occasion':
          value = occasion.label || 'Casual';
          score = Math.min(100, 60 + (occasion.score || 0));
          confidence = Math.min(95, 70 + (occasion.score || 0) * 0.3);
          reasoning = `Keywords matched: ${occasion.label || 'general casual terms'}. ${occasion.score > 0 ? 'Strong occasion signals detected.' : 'Defaulting to casual.'}`;
          break;
        case 'season':
          value = season.label || 'All Season';
          score = Math.min(100, 55 + (season.score || 0));
          confidence = Math.min(90, 65 + (season.score || 0) * 0.3);
          reasoning = `Seasonal indicators: ${season.label || 'versatile year-round appeal'}. ${season.score > 0 ? 'Clear seasonal markers found.' : 'No strong seasonal bias.'}`;
          break;
        case 'audience':
          value = audience.label || 'Festival Shoppers';
          score = Math.min(100, 50 + (audience.score || 0));
          confidence = Math.min(90, 60 + (audience.score || 0) * 0.3);
          reasoning = `Target signals: ${audience.label || 'broad appeal'}. ${audience.score > 0 ? 'Audience-specific keywords detected.' : 'General ethnic wear audience.'}`;
          break;
        case 'fabricStyle':
          value = fabricStyle.label || 'Silk';
          score = Math.min(100, 65 + (fabricStyle.score || 0));
          confidence = Math.min(95, 70 + (fabricStyle.score || 0) * 0.3);
          reasoning = `Fabric mentions: ${fabricStyle.label || 'premium silk assumed'}. ${fabricStyle.score > 0 ? 'Specific fabric identified.' : 'Defaulting to silk for ethnic wear.'}`;
          break;
        case 'printType':
          value = printType.label || 'Traditional';
          score = Math.min(100, 55 + (printType.score || 0));
          confidence = Math.min(90, 60 + (printType.score || 0) * 0.3);
          reasoning = `Print analysis: ${printType.label || 'classic traditional motifs'}. ${printType.score > 0 ? 'Print style keywords found.' : 'Traditional ethnic prints assumed.'}`;
          break;
        case 'colorFamily':
          value = colorFamily.label || 'Reds';
          score = Math.min(100, 60 + (colorFamily.score || 0));
          confidence = Math.min(95, 65 + (colorFamily.score || 0) * 0.3);
          reasoning = `Color detection: ${colorFamily.label || 'classic red tones'}. ${colorFamily.score > 0 ? 'Dominant color family identified.' : 'Red family default for Indian ethnic wear.'}`;
          break;
        case 'trendingScore':
          value = `${calculateScore(trendingBase, [])}%`;
          score = calculateScore(trendingBase, []);
          confidence = 80;
          reasoning = `Based on occasion relevance, seasonal alignment, and social signals. ${occasion.score > 10 ? 'High occasion relevance boosts trend score.' : 'Moderate trend potential.'}`;
          break;
        case 'luxuryScore':
          value = `${calculateScore(luxuryBase, [])}%`;
          score = calculateScore(luxuryBase, []);
          confidence = 82;
          reasoning = `Price tier, fabric quality, and occasion prestige. ${priceFactor > 10 ? 'Premium pricing indicates luxury positioning.' : 'Accessible luxury segment.'} ${fabricStyle.label === 'Silk' || fabricStyle.label === 'Velvet' ? 'Premium fabric adds luxury value.' : ''}`;
          break;
        case 'officeWearScore':
          value = `${calculateScore(officeBase, [])}%`;
          score = calculateScore(officeBase, []);
          confidence = 78;
          reasoning = `Professional appropriateness: ${occasion.label === 'Office' ? 'Designed for workplace.' : 'Casual/occasion wear, limited office suitability.'} ${audience.label === 'Working Women' ? 'Target audience aligns.' : ''} ${fabricStyle.label === 'Cotton' || fabricStyle.label === 'Linen' ? 'Breathable fabric suitable for long hours.' : ''}`;
          break;
        case 'festivalScore':
          value = `${calculateScore(festivalBase, [])}%`;
          score = calculateScore(festivalBase, []);
          confidence = 85;
          reasoning = `Festival relevance: ${occasion.label.includes('Festival') || occasion.label.includes('Haldi') || occasion.label.includes('Mehndi') || occasion.label.includes('Sangeet') ? 'Direct festival occasion match.' : 'General ethnic wear, festival appropriate.'} ${fabricStyle.label === 'Silk' ? 'Silk is festival-preferred.' : ''} ${colorFamily.label === 'Reds' || colorFamily.label === 'Metallics' ? 'Auspicious color family.' : ''}`;
          break;
      }

      return {
        key: def.key,
        label: def.label,
        icon: def.icon,
        value,
        score,
        confidence,
        reasoning,
      };
    });

    const classification: ProductClassification = {
      product,
      results,
      classifiedAt: new Date().toISOString(),
    };

    this.history.update(list => [classification, ...list].slice(0, 20));
    this.persist();

    return results;
  }

  clearHistory(): void {
    this.history.set([]);
    this.persist();
  }

  getDefaultProduct(): ProductInput {
    return defaultProductInput();
  }
}