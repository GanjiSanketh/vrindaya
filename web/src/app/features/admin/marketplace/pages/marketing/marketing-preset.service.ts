import { Injectable, signal } from '@angular/core';
import {
  DEFAULT_PRESET_CONFIG,
  PRESET_CATEGORIES,
  type MarketingPreset,
  type MarketingPresetConfig,
  type MarketingPresetDraft,
  type PresetCategory,
} from './models/marketing-preset.model';

export { PRESET_CATEGORIES };

const STORAGE_KEY = 'vrindaya_marketing_presets';

interface PresetSeed {
  name: string;
  category: PresetCategory;
  config: Partial<MarketingPresetConfig>;
  platform?: MarketingPreset['platform'];
}

const DEFAULT_PRESET_SEEDS: PresetSeed[] = [
  {
    name: 'Luxury Fashion',
    category: 'Essentials',
    platform: 'instagram-post',
    config: { tone: 'luxury', cta: 'Discover Now', keywords: 'premium, designer, luxury', audience: 'affluent shoppers' },
  },
  {
    name: 'Minimal',
    category: 'Essentials',
    platform: 'landing',
    config: { tone: 'professional', cta: 'Learn More', heading: 'Keep it simple', audience: 'modern minimalists' },
  },
  {
    name: 'Traditional',
    category: 'Essentials',
    config: { tone: 'elegant', keywords: 'handwoven, ethnic, heritage', audience: 'heritage lovers' },
  },
  {
    name: 'Wedding Collection',
    category: 'Occasions',
    platform: 'flipkart',
    config: { tone: 'luxury', keywords: 'bridal, festive, embellished', audience: 'brides-to-be' },
  },
  {
    name: 'Office Wear',
    category: 'Occasions',
    platform: 'blog',
    config: { tone: 'professional', keywords: 'corporate, formal, comfortable', audience: 'working professionals' },
  },
  {
    name: 'College Wear',
    category: 'Occasions',
    platform: 'instagram-reel',
    config: { tone: 'trendy', keywords: 'campus, casual, youthful', audience: 'college students' },
  },
  {
    name: 'Festive',
    category: 'Occasions',
    platform: 'caption',
    config: { tone: 'elegant', emojis: true, keywords: 'festive, celebration, colours', audience: 'festival shoppers' },
  },
  {
    name: 'New Arrival',
    category: 'Promotions',
    platform: 'facebook-post',
    config: { tone: 'trendy', heading: 'Just Dropped', hashtags: true, audience: 'trend followers' },
  },
  {
    name: 'Flash Sale',
    category: 'Promotions',
    platform: 'whatsapp-catalog',
    config: { tone: 'casual', cta: 'Get the Offer', length: 'short', keywords: 'sale, limited, price drop' },
  },
  {
    name: 'Buy 1 Get 1',
    category: 'Promotions',
    platform: 'email',
    config: { tone: 'casual', cta: 'Shop Now', length: 'short', heading: 'Buy 1 Get 1 Free' },
  },
  {
    name: 'Limited Stock',
    category: 'Promotions',
    platform: 'seo',
    config: { tone: 'trendy', cta: 'Shop Now', heading: 'Almost Gone', keywords: 'limited stock, hurry, last few' },
  },
  {
    name: 'Summer Collection',
    category: 'Collections',
    platform: 'pinterest',
    config: { tone: 'trendy', keywords: 'summer, breezy, cotton', audience: 'sun-seekers' },
  },
  {
    name: 'Monsoon Collection',
    category: 'Collections',
    platform: 'landing',
    config: { tone: 'casual', keywords: 'rainwear, monsoon, vibrant', audience: 'rainy-day shoppers' },
  },
  {
    name: 'Premium Collection',
    category: 'Collections',
    platform: 'landing',
    config: { tone: 'luxury', cta: 'Discover Now', keywords: 'premium, curated, exclusive', audience: 'premium buyers' },
  },
  {
    name: 'Designer Collection',
    category: 'Collections',
    platform: 'instagram-post',
    config: { tone: 'elegant', keywords: 'designer, couture, runway', audience: 'fashion-forward' },
  },
];

@Injectable({ providedIn: 'root' })
export class MarketingPresetService {
  readonly presets = signal<MarketingPreset[]>([]);

  constructor() {
    this.load();
  }

  create(input: MarketingPresetDraft): void {
    const now = new Date().toISOString();
    const preset: MarketingPreset = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.presets.update(list => [preset, ...list]);
    this.persist();
  }

  update(id: string, patch: Partial<MarketingPresetDraft>): void {
    this.presets.update(list =>
      list.map(p => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
    );
    this.persist();
  }

  remove(id: string): void {
    this.presets.update(list => list.filter(p => p.id !== id));
    this.persist();
  }

  duplicate(id: string): void {
    const source = this.presets().find(p => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: MarketingPreset = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (copy)`,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    this.presets.update(list => [copy, ...list]);
    this.persist();
  }

  toggleFavorite(id: string): void {
    this.presets.update(list =>
      list.map(p => (p.id === id ? { ...p, favorite: !p.favorite, updatedAt: new Date().toISOString() } : p)),
    );
    this.persist();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.presets.set(JSON.parse(raw));
        return;
      }
    } catch { /* ignore */ }
    this.seed();
  }

  private seed(): void {
    const now = new Date().toISOString();
    const seeded: MarketingPreset[] = DEFAULT_PRESET_SEEDS.map(s => ({
      id: crypto.randomUUID(),
      name: s.name,
      category: s.category,
      platform: s.platform,
      favorite: false,
      config: { ...DEFAULT_PRESET_CONFIG, ...s.config },
      createdAt: now,
      updatedAt: now,
    }));
    this.presets.set(seeded);
    this.persist();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.presets())); } catch { /* ignore */ }
  }
}