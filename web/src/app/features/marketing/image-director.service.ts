import { Injectable, signal } from '@angular/core';
import {
  ImageDirectorPreset,
  ImageDirectorPresetDraft,
  ImageDirectorSettings,
  defaultSettings,
} from '../models/image-director.model';

const STORAGE_KEY = 'vrindaya_image_director_presets';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function seed(): ImageDirectorPreset[] {
  const now = Date.now();
  const make = (name: string, favorite: boolean, overrides: Partial<ImageDirectorSettings>): ImageDirectorPreset => ({
    id: uid(),
    name,
    favorite,
    settings: { ...defaultSettings(), ...overrides },
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  });

  return [
    make('Heritage Editorial', true, {
      imageStyle: 'Heritage Editorial',
      background: 'Heritage Arch',
      colorPalette: 'Deep Teal & Gold',
      lighting: 'Golden Hour',
      pose: 'Twirling Detail',
      negativePrompt: 'cluttered background, oversaturated colors, modern props, watermarks',
      typography: 'Libre Baskerville / Lato',
      brandElements: 'logo bottom-center, heritage gold border, embossed watermark',
      outputQuality: 'Ultra (4096x4096)',
    }),
    make('Studio Catalog', false, {
      imageStyle: 'Studio Catalog',
      background: 'Studio White',
      lighting: 'Studio Softbox',
      composition: 'Center Symmetry',
      colorPalette: 'Monochrome Ivory',
      model: 'No Model (Flat Lay)',
      typography: 'Merriweather / Source Sans',
      brandElements: 'logo top-left, clean minimal frame',
      outputQuality: 'High (2048x2048)',
    }),
    make('Festive Lookbook', false, {
      imageStyle: 'Cinematic',
      background: 'Urban Brick',
      lighting: 'Moody Low-light',
      colorPalette: 'Festival Vibrancy',
      pose: 'Walking Candid',
      props: 'festive lamps, brass diya',
      accessories: 'jhumkas, maang tikka, potli bag',
      typography: 'Playfair Display / Inter',
      brandElements: 'logo top-right, foil stamping, festive color bar',
      outputQuality: 'High (2048x2048)',
    }),
    make('Minimal Product', false, {
      imageStyle: 'Flat Lay',
      background: 'Minimal Beige',
      lighting: 'Soft Daylight',
      composition: 'Negative Space',
      colorPalette: 'Earth Tones',
      model: 'No Model (Flat Lay)',
      props: 'neutral linen, small dried pampas',
      typography: 'Cormorant Garamond / DM Sans',
      brandElements: 'logo top-right, subtle watermark',
      outputQuality: 'Web Optimized (72 DPI)',
    }),
  ];
}

@Injectable({ providedIn: 'root' })
export class ImageDirectorService {
  readonly presets = signal<ImageDirectorPreset[]>(this.load());

  private load(): ImageDirectorPreset[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ImageDirectorPreset[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return seed();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.presets())); } catch { /* ignore */ }
  }

  save(draft: ImageDirectorPresetDraft): ImageDirectorPreset {
    const now = new Date().toISOString();
    const preset: ImageDirectorPreset = { ...draft, id: uid(), createdAt: now, updatedAt: now };
    this.presets.update(list => [preset, ...list]);
    this.persist();
    return preset;
  }

  update(id: string, draft: Partial<ImageDirectorPresetDraft>): void {
    this.presets.update(list =>
      list.map(p => (p.id === id ? { ...p, ...draft, updatedAt: new Date().toISOString() } : p)),
    );
    this.persist();
  }

  duplicate(id: string): void {
    const source = this.presets().find(p => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: ImageDirectorPreset = {
      ...source,
      id: uid(),
      name: source.name + ' (copy)',
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    this.presets.update(list => [copy, ...list]);
    this.persist();
  }

  remove(id: string): void {
    this.presets.update(list => list.filter(p => p.id !== id));
    this.persist();
  }

  toggleFavorite(id: string): void {
    this.presets.update(list => list.map(p => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
    this.persist();
  }

  reset(): void {
    this.presets.set(seed());
    this.persist();
  }
}