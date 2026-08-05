export type ClassificationKey =
  | 'occasion'
  | 'season'
  | 'audience'
  | 'fabricStyle'
  | 'printType'
  | 'colorFamily'
  | 'trendingScore'
  | 'luxuryScore'
  | 'officeWearScore'
  | 'festivalScore';

export interface ClassificationResult {
  key: ClassificationKey;
  label: string;
  icon: string;
  value: string;
  score: number;
  confidence: number;
  reasoning: string;
}

export interface ProductInput {
  name: string;
  category: string;
  description: string;
  price: number;
  tags: string[];
}

export interface ProductClassification {
  product: ProductInput;
  results: ClassificationResult[];
  classifiedAt: string;
}

export const CLASSIFICATION_KEYS: { key: ClassificationKey; label: string; icon: string; type: 'label' | 'score' }[] = [
  { key: 'occasion', label: 'Occasion', icon: 'bi-calendar-event', type: 'label' },
  { key: 'season', label: 'Season', icon: 'bi-sun', type: 'label' },
  { key: 'audience', label: 'Audience', icon: 'bi-people', type: 'label' },
  { key: 'fabricStyle', label: 'Fabric Style', icon: 'bi-scissors', type: 'label' },
  { key: 'printType', label: 'Print Type', icon: 'bi-brush', type: 'label' },
  { key: 'colorFamily', label: 'Color Family', icon: 'bi-palette', type: 'label' },
  { key: 'trendingScore', label: 'Trending Score', icon: 'bi-graph-up', type: 'score' },
  { key: 'luxuryScore', label: 'Luxury Score', icon: 'bi-gem', type: 'score' },
  { key: 'officeWearScore', label: 'Office Wear Score', icon: 'bi-briefcase', type: 'score' },
  { key: 'festivalScore', label: 'Festival Score', icon: 'bi-stars', type: 'score' },
];

export const OCCASIONS = ['Wedding', 'Festival', 'Office', 'Casual', 'Party', 'Bridal', 'Haldi', 'Mehndi', 'Reception', 'Sangeet'];
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];
export const AUDIENCES = ['Brides', 'Working Women', 'College Students', 'Festival Shoppers', 'Luxury Buyers', 'Mature Women'];
export const FABRIC_STYLES = ['Silk', 'Cotton', 'Chiffon', 'Georgette', 'Velvet', 'Organza', 'Linen', 'Brocade', 'Banarasi', 'Chanderi'];
export const PRINT_TYPES = ['Floral', 'Geometric', 'Abstract', 'Traditional', 'Solid', 'Embroidered', 'Bandhani', 'Leheriya', 'Ikat', 'Block Print'];
export const COLOR_FAMILIES = ['Reds', 'Blues', 'Greens', 'Yellows', 'Pinks', 'Purples', 'Oranges', 'Neutrals', 'Metallics', 'Pastels'];

export function defaultProductInput(): ProductInput {
  return {
    name: '',
    category: 'Sarees',
    description: '',
    price: 0,
    tags: [],
  };
}