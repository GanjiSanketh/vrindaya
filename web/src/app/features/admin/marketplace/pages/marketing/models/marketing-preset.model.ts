import type { MarketingTool } from './marketing-platform.model';

export type PresetCategory = 'Occasions' | 'Collections' | 'Promotions' | 'Essentials';

export const PRESET_CATEGORIES: PresetCategory[] = [
  'Occasions',
  'Collections',
  'Promotions',
  'Essentials',
];

export interface MarketingPresetConfig {
  tone: string;
  length: string;
  cta: string;
  keywords: string;
  audience: string;
  subject: string;
  heading: string;
  emojis: boolean;
  hashtags: boolean;
}

export interface MarketingPresetDraft {
  name: string;
  category: PresetCategory;
  platform?: MarketingTool;
  favorite: boolean;
  config: MarketingPresetConfig;
}

export interface MarketingPreset extends MarketingPresetDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PRESET_CONFIG: MarketingPresetConfig = {
  tone: 'professional',
  length: 'medium',
  cta: 'Shop Now',
  keywords: '',
  audience: '',
  subject: '',
  heading: '',
  emojis: false,
  hashtags: true,
};