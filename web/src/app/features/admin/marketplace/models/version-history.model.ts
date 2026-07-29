export type GenerationType = 'title' | 'description' | 'keywords' | 'seo' | 'highlights' | 'specifications' | 'attributes' | 'everything' | 'fabric' | 'fit' | 'sleeve' | 'pattern' | 'neck' | 'occasion' | 'care' | 'imageAltText' | 'marketplaceAttributes';

export interface VersionEntry {
  id: string;
  generationType: GenerationType | string;
  label: string;
  prompt: string;
  provider: string;
  providerLabel: string;
  model: string;
  visionModel?: string;
  temperature?: number;
  visionResult?: {
    raw: string;
    fields: Record<string, string>;
  };
  inputSnapshot: Record<string, any>;
  generatedContent: Record<string, any>;
  generatedFields: string[];
  marketplace?: string;
  createdAt: string;
  createdBy: string;
  userLabel?: string;
  approved: boolean;
}

export const GENERATION_TYPE_LABELS: Record<string, string> = {
  title: 'Title', description: 'Description', keywords: 'Keywords',
  seo: 'SEO', highlights: 'Highlights', specifications: 'Specifications',
  attributes: 'Attributes', everything: 'Everything', fabric: 'Fabric',
  fit: 'Fit', sleeve: 'Sleeve', pattern: 'Pattern', neck: 'Neck',
  occasion: 'Occasion', care: 'Care', imageAltText: 'Image Alt Text',
  marketplaceAttributes: 'Marketplace Attributes',
};

export const STORAGE_KEY_VERSIONS = 'vrindaya_version_history';
