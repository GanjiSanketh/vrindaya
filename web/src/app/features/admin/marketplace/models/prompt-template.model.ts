export type PromptMarketplace = 'flipkart' | 'meesho' | 'amazon' | 'website' | 'instagram';

export type PromptCategory = 'title' | 'description' | 'keywords' | 'seo' | 'highlights' | 'specifications' | 'attributes';

export const PROMPT_MARKETPLACES: PromptMarketplace[] = ['flipkart', 'meesho', 'amazon', 'website', 'instagram'];

export const PROMPT_MARKETPLACE_LABELS: Record<PromptMarketplace, string> = {
  flipkart: 'Flipkart', meesho: 'Meesho', amazon: 'Amazon', website: 'Website', instagram: 'Instagram',
};

export const PROMPT_CATEGORIES: PromptCategory[] = ['title', 'description', 'keywords', 'seo', 'highlights', 'specifications', 'attributes'];

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  title: 'Title', description: 'Description', keywords: 'Keywords',
  seo: 'SEO', highlights: 'Highlights', specifications: 'Specifications', attributes: 'Attributes',
};

export const PROMPT_VARIABLES = ['product', 'vision', 'brand', 'fabric', 'occasion', 'keywords'] as const;

export type PromptVariable = (typeof PROMPT_VARIABLES)[number];

export const PROMPT_VARIABLE_LABELS: Record<PromptVariable, string> = {
  product: 'Product Name', vision: 'Vision Analysis', brand: 'Brand',
  fabric: 'Fabric', occasion: 'Occasion', keywords: 'Keywords',
};

export interface PromptTemplateVersion {
  id: string;
  content: string;
  version: number;
  createdAt: string;
  createdBy: string;
  comment: string;
}

export interface PromptTemplate {
  id: string;
  marketplace: PromptMarketplace;
  category: PromptCategory;
  name: string;
  content: string;
  variables: string[];
  version: number;
  versions: PromptTemplateVersion[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export function createPromptTemplate(
  marketplace: PromptMarketplace,
  category: PromptCategory,
): PromptTemplate {
  return {
    id: crypto.randomUUID(),
    marketplace,
    category,
    name: `${PROMPT_MARKETPLACE_LABELS[marketplace]} ${PROMPT_CATEGORY_LABELS[category]}`,
    content: '',
    variables: [...PROMPT_VARIABLES],
    version: 0,
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  };
}

export const STORAGE_KEY_PROMPTS = 'vrindaya_prompt_templates';

export const DEFAULT_PROMPTS: Record<string, string> = {
  'flipkart-title': 'Write a compelling Flipkart product title for {{product}}. Brand: {{brand}}. Fabric: {{fabric}}. Occasion: {{occasion}}. Max 60 characters.',
  'flipkart-description': 'Write a detailed Flipkart product description for {{product}}. Include fabric details ({{fabric}}), occasion suitability ({{occasion}}), and key highlights. Vision data: {{vision}}.',
  'flipkart-keywords': 'Generate 15 Flipkart search keywords for {{product}}. Brand: {{brand}}. Fabric: {{fabric}}. Occasion: {{occasion}}. Include: {{keywords}}.',
  'flipkart-seo': 'Write SEO metadata for Flipkart listing of {{product}}. Brand: {{brand}}. Use vision data: {{vision}}.',
  'flipkart-highlights': 'List 5 key highlights for {{product}} on Flipkart. Fabric: {{fabric}}. Occasion: {{occasion}}.',
  'flipkart-specifications': 'Generate technical specifications for {{product}} on Flipkart. Use vision data: {{vision}}.',
  'flipkart-attributes': 'Set Flipkart attribute values for {{product}}. Brand: {{brand}}. Fabric: {{fabric}}.',
  'meesho-title': 'Create an attractive Meesho product title for {{product}}. Fabric: {{fabric}}. Occasion: {{occasion}}. Keep under 50 characters.',
  'meesho-description': 'Write a persuasive Meesho product description for {{product}}. Fabric: {{fabric}}. Occasion: {{occasion}}. Vision data: {{vision}}.',
  'meesho-keywords': 'Generate 20 Meesho search keywords for {{product}}. Include: {{keywords}}. Fabric: {{fabric}}.',
  'meesho-seo': 'Write Meesho SEO metadata for {{product}}. Use vision: {{vision}}. Keywords: {{keywords}}.',
  'meesho-highlights': 'List 5 selling points for {{product}} on Meesho. Fabric: {{fabric}}. Occasion: {{occasion}}.',
  'meesho-specifications': 'Generate Meesho product specifications for {{product}}. Vision: {{vision}}.',
  'meesho-attributes': 'Set Meesho attributes for {{product}}. Fabric: {{fabric}}. Brand: {{brand}}.',
  'amazon-title': 'Write an Amazon product title for {{product}}. Brand: {{brand}}. Fabric: {{fabric}}. Max 200 characters with key features.',
  'amazon-description': 'Write an Amazon product description for {{product}}. Include fabric ({{fabric}}), occasion ({{occasion}}), and vision insights ({{vision}}).',
  'amazon-keywords': 'Generate Amazon backend search terms for {{product}}. Brand: {{brand}}. Include: {{keywords}}.',
  'amazon-seo': 'Write Amazon SEO title and bullet points for {{product}}. Vision: {{vision}}. Keywords: {{keywords}}.',
  'amazon-highlights': 'Write 5 Amazon bullet points for {{product}}. Fabric: {{fabric}}. Occasion: {{occasion}}.',
  'amazon-specifications': 'Generate Amazon product specs for {{product}}. Vision data: {{vision}}.',
  'amazon-attributes': 'Set Amazon browse node attributes for {{product}}. Fabric: {{fabric}}. Brand: {{brand}}.',
  'website-title': 'Write an SEO-optimized website product title for {{product}}. Brand: {{brand}}. Fabric: {{fabric}}.',
  'website-description': 'Write a rich website product description for {{product}}. Include fabric ({{fabric}}), occasion ({{occasion}}), styling tips. Vision: {{vision}}.',
  'website-keywords': 'Generate website SEO keywords for {{product}}. Brand: {{brand}}. Include: {{keywords}}.',
  'website-seo': 'Write meta title, description and OG tags for {{product}} website page. Vision: {{vision}}.',
  'website-highlights': 'List key features of {{product}} for website. Fabric: {{fabric}}. Occasion: {{occasion}}.',
  'website-specifications': 'Generate website product specifications table for {{product}}. Vision: {{vision}}.',
  'website-attributes': 'Set website product attributes for {{product}}. Fabric: {{fabric}}. Brand: {{brand}}.',
  'instagram-title': 'Write an Instagram caption title for {{product}}. Keep it trendy and short.',
  'instagram-description': 'Write an Instagram post description for {{product}}. Fabric: {{fabric}}. Occasion: {{occasion}}. Include hashtags.',
  'instagram-keywords': 'Generate Instagram hashtags for {{product}}. Fabric: {{fabric}}. Occasion: {{occasion}}.',
  'instagram-seo': 'Write Instagram SEO caption with keywords for {{product}}. Keywords: {{keywords}}.',
  'instagram-highlights': 'Write Instagram story highlights text for {{product}}. Fabric: {{fabric}}.',
  'instagram-specifications': 'Write a brief Instagram reel script describing {{product}} specs. Vision: {{vision}}.',
  'instagram-attributes': 'Set Instagram shopping attributes for {{product}}. Fabric: {{fabric}}. Brand: {{brand}}.',
};
