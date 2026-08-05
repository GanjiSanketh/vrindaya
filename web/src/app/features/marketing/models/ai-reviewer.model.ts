export type ReviewCategory =
  | 'Caption'
  | 'Image Prompt'
  | 'Hashtags'
  | 'Hook'
  | 'Carousel'
  | 'Story'
  | 'CTA'
  | 'SEO'
  | 'Grammar'
  | 'Brand Consistency';

export const REVIEW_CATEGORIES: ReviewCategory[] = [
  'Caption',
  'Image Prompt',
  'Hashtags',
  'Hook',
  'Carousel',
  'Story',
  'CTA',
  'SEO',
  'Grammar',
  'Brand Consistency',
];

export const REVIEW_CATEGORY_ICONS: Record<ReviewCategory, string> = {
  'Caption': 'bi-chat-quote',
  'Image Prompt': 'bi-image',
  'Hashtags': 'bi-hash',
  'Hook': 'bi-lightning-charge',
  'Carousel': 'bi-layout-three-columns',
  'Story': 'bi-magic',
  'CTA': 'bi-bullseye',
  'SEO': 'bi-search-heart',
  'Grammar': 'bi-spellcheck',
  'Brand Consistency': 'bi-patch-check',
};

export type ReviewSeverity = 'high' | 'medium' | 'low';

export interface ReviewIssue {
  severity: ReviewSeverity;
  problem: string;
}

export interface ReviewResult {
  id: string;
  category: ReviewCategory;
  content: string;
  score: number;
  verdict: string;
  problems: ReviewIssue[];
  suggestions: string[];
  improvements: string[];
  createdAt: string;
}

export function scoreTone(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 75) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

export function severityTone(severity: ReviewSeverity): string {
  return severity === 'high' ? '#dc2626' : severity === 'medium' ? '#d97706' : '#0f6f84';
}

export const REVIEW_SAMPLE_CONTENT: Record<ReviewCategory, string> = {
  'Caption': 'Introducing the Zari Luxe Anarkali from Vrindaya. Handcrafted in soft georgette with intricate zari detailing. Slip into something extraordinary this festive season. #Vrindaya #FestiveEdit #ZariLuxe',
  'Image Prompt': 'Editorial Minimal shot of a South Asian model in a deep teal anarkali, soft daylight, minimal beige background, rule of thirds composition, 4:5 aspect, earth tones',
  'Hashtags': '#vrindaya #anarkali #fashion #indianwear #zari #luxe #festive #ethnicwear',
  'Hook': 'Is your festive wardrobe ready? Vrindaya presents the Zari Luxe collection.',
  'Carousel': 'Slide 1: The Zari Luxe Anarkali\nSlide 2: Fabric story - soft georgette\nSlide 3: Detailing - intricate zari\nSlide 4: Styling - gold jhumkas\nSlide 5: How to order',
  'Story': 'Behind the scenes of our Zari Luxe shoot. Link in bio to shop the look.',
  'CTA': 'Shop the collection now and get free shipping on orders above Rs 2,999. Tap to explore.',
  'SEO': 'Vrindaya luxury ethnic wear anarkali collection, buy designer anarkali online',
  'Grammar': 'this zari anarkali is really pretty and it looks good on everyone, and the fabric is soft but it might crease, but it is still worth it',
  'Brand Consistency': 'Handcrafted with heritage craftsmanship. Elegant. Premium. The Vrindaya promise of timeless luxury.',
};