import { Injectable, signal } from '@angular/core';
import { MEMORY_CATEGORIES, type AiMemoryDraft, type AiMemoryEntry } from './models/ai-memory.model';

const STORAGE_KEY = 'vrindaya_ai_memory';

@Injectable({ providedIn: 'root' })
export class AiMemoryService {
  readonly entries = signal<AiMemoryEntry[]>([]);

  constructor() {
    this.load();
  }

  create(draft: AiMemoryDraft): void {
    const now = new Date().toISOString();
    const entry: AiMemoryEntry = {
      ...draft,
      fields: { ...draft.fields },
      tags: [...draft.tags],
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.entries.update(list => [entry, ...list]);
    this.persist();
  }

  update(id: string, patch: Partial<AiMemoryDraft>): void {
    this.entries.update(list =>
      list.map(e =>
        e.id === id
          ? {
              ...e,
              ...patch,
              fields: patch.fields ? { ...patch.fields } : e.fields,
              tags: patch.tags ? [...patch.tags] : e.tags,
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
    this.persist();
  }

  remove(id: string): void {
    this.entries.update(list => list.filter(e => e.id !== id));
    this.persist();
  }

  countFor(category: string): number {
    return this.entries().filter(e => e.category === category).length;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AiMemoryEntry[];
        if (Array.isArray(parsed)) {
          this.entries.set(parsed);
          return;
        }
      }
    } catch { /* ignore */ }
    this.seed();
  }

  private seed(): void {
    const now = new Date().toISOString();
    const starter: AiMemoryDraft[] = [
      {
        category: 'Brand Information',
        title: 'Core Brand Identity',
        source: 'Brand Kit',
        confidence: 98,
        tags: ['identity', 'core'],
        fields: {
          brandName: 'Vrindaya',
          mission: 'Crafting timeless ethnic wear that celebrates Indian heritage.',
          values: 'Heritage · Craftsmanship · Elegance · Sustainability',
          positioning: 'Premium ethnic wear for the modern woman.',
          targetAudience: 'Fashion-conscious women 25–45, premium buyers',
        },
      },
      {
        category: 'Products',
        title: 'Silk Kurta Set',
        source: 'Manual',
        confidence: 90,
        tags: ['best-seller', 'ethnic'],
        fields: {
          productName: 'Premium Silk Kurta Set',
          category: 'Ethnic Wear',
          materials: 'Pure silk, handcrafted embroidery',
          priceRange: '₹2,499 – ₹3,999',
          sellingPoints: 'Handwoven, breathable, festive-ready',
        },
      },
      {
        category: 'Successful Posts',
        title: 'Wedding Season Post',
        source: 'Analytics',
        confidence: 92,
        tags: ['win', 'high-engagement'],
        fields: {
          postTitle: 'Wedding Season Reel',
          platform: 'Instagram',
          engagement: 'High',
          lesson: 'Emotional storytelling + lifestyle shots drove engagement',
        },
      },
      {
        category: 'Failed Posts',
        title: 'Price-led Promo',
        source: 'Analytics',
        confidence: 88,
        tags: ['avoid'],
        fields: {
          postTitle: 'Flat Discount Ad',
          platform: 'Facebook',
          issue: 'Too salesy, read as low quality',
          lesson: 'Avoid discount-heavy language; lead with craft and story',
        },
      },
      {
        category: 'Top Performing Hashtags',
        title: 'Evergreen Set',
        source: 'Analytics',
        confidence: 85,
        tags: ['instagram'],
        fields: {
          hashtag: '#VrindayaStyle #HandmadeEthnic #IndianWear',
          reach: 'High reach on feeds',
          note: 'Use in every IG post',
        },
      },
      {
        category: 'Writing Style',
        title: 'Luxury Tone',
        source: 'Manual',
        confidence: 95,
        tags: ['voice'],
        fields: {
          element: 'Tone',
          example: 'Elegant, warm, conversational',
          rule: 'Aspirational, never desperate; avoid price talk',
        },
      },
      {
        category: 'Image Style',
        title: 'Editorial Minimal',
        source: 'Brand Kit',
        confidence: 93,
        tags: ['visual'],
        fields: {
          styleName: 'Editorial Minimal',
          mood: 'Soft, warm, heritage',
          palette: 'Earth tones · ivory · deep teal · gold',
          guidelines: 'Clean backgrounds, natural light, textile detail shots',
        },
      },
    ];
    this.entries.set(starter.map(d => ({ ...d, id: crypto.randomUUID(), createdAt: now, updatedAt: now })));
    this.persist();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries())); } catch { /* ignore */ }
  }
}