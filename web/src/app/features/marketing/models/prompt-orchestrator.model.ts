export type PromptSourceId =
  | 'brand'
  | 'knowledge'
  | 'templates'
  | 'campaign'
  | 'audience'
  | 'products'
  | 'platform'
  | 'voice'
  | 'library';

export interface PromptSourceItem {
  id: string;
  label: string;
  content: string;
}

export interface PromptSourceDef {
  id: PromptSourceId;
  label: string;
  icon: string;
  color: string;
  description: string;
  items: PromptSourceItem[];
}

export const PROMPT_SOURCES: PromptSourceDef[] = [
  {
    id: 'brand',
    label: 'Brand Profile',
    icon: 'bi-tags',
    color: '#0f6f84',
    description: 'Identity, mission, positioning and tone guidelines.',
    items: [
      { id: 'brand-vision', label: 'Vision & Mission', content: 'Vrindaya exists to celebrate Indian heritage through timeless, handcrafted ethnic wear for the modern woman.' },
      { id: 'brand-values', label: 'Brand Values', content: 'Heritage, craftsmanship, elegance and sustainability guide every collection and message.' },
      { id: 'brand-positioning', label: 'Positioning', content: 'Premium ethnic wear that blends tradition with contemporary style.' },
      { id: 'brand-tone', label: 'Tone Guidelines', content: 'Warm, elegant and conversational. Aspirational, never desperate. Avoid price-led language.' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    icon: 'bi-book',
    color: '#c9a54c',
    description: 'Fabric, silhouette and occasion knowledge from the Fashion Knowledge Engine.',
    items: [
      { id: 'kb-fabric', label: 'Fabric & Weave Knowledge', content: 'Know fabrics: pure silk, handloom cotton, organza, chanderi. Highlight breathability and drape.' },
      { id: 'kb-silhouette', label: 'Silhouette Guide', content: 'Recommend silhouettes by body type: A-line kurtas, flared anarkalis, straight co-ords.' },
      { id: 'kb-occasion', label: 'Occasion Rules', content: 'Map outfits to occasions: festive, office, wedding guest, casual daywear.' },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: 'bi-files',
    color: '#8b5cf6',
    description: 'Structural skeletons from the Prompt Template Library.',
    items: [
      { id: 'tpl-ig-post', label: 'Instagram Post Template', content: 'Hook line → 2-3 body lines → engagement question → 5 relevant hashtags.' },
      { id: 'tpl-reel', label: 'Reel Script Template', content: 'Hook (first 3s) → visual beats → text overlays → music suggestion → CTA.' },
      { id: 'tpl-product', label: 'Product Description Template', content: 'Title ≤ 70 chars → short benefit-led intro → bullet features → care note → CTA.' },
    ],
  },
  {
    id: 'campaign',
    label: 'Campaign',
    icon: 'bi-megaphone',
    color: '#22c55e',
    description: 'Active campaign goal, key message and offer.',
    items: [
      { id: 'cmp-goal', label: 'Campaign Goal', content: 'Drive awareness for the new "Monsoon Collection" and generate pre-launch engagement.' },
      { id: 'cmp-message', label: 'Key Message', content: 'Breezy, monsoon-ready styles crafted for comfort and colour.' },
      { id: 'cmp-offer', label: 'Offer & CTA', content: 'Early-access preview; CTA "Shop the Look".' },
    ],
  },
  {
    id: 'audience',
    label: 'Audience',
    icon: 'bi-people',
    color: '#6366f1',
    description: 'Who the content speaks to and what drives them.',
    items: [
      { id: 'aud-demo', label: 'Demographics', content: 'Fashion-conscious women, 25-45, urban & semi-urban India.' },
      { id: 'aud-pain', label: 'Pain Points', content: 'Hard to find breathable festive wear that looks premium; doubts about online fit.' },
      { id: 'aud-aspiration', label: 'Aspirations', content: 'Effortless elegance, confidence, a wardrobe that tells a story.' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    icon: 'bi-bag',
    color: '#f59e0b',
    description: 'Product details, USPs and materials for the current focus.',
    items: [
      { id: 'prd-details', label: 'Product Details', content: 'Embroidered Cotton Kurta — handwoven, 100% cotton, pastel palette, sizes XS-XXL.' },
      { id: 'prd-usp', label: 'Unique Selling Points', content: 'Handcrafted, breathable, versatile for day-to-evening wear.' },
      { id: 'prd-materials', label: 'Materials & Care', content: 'Pure cotton; gentle machine wash; colour-safe; iron on low.' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: 'bi-collection',
    color: '#0ea5e9',
    description: 'Platform-native rules, limits and hashtag policy.',
    items: [
      { id: 'pf-rules', label: 'Platform Rules', content: 'Native copy for the selected platform; keep within character limits; mobile-first.' },
      { id: 'pf-format', label: 'Format Spec', content: 'Instagram: caption ≤ 2200 chars, 3-5 hashtags, single CTA. Keep hooks in the first line.' },
      { id: 'pf-hashtags', label: 'Hashtag Policy', content: 'Use approved Vrindaya + category hashtags; avoid trending noise.' },
    ],
  },
  {
    id: 'voice',
    label: 'Brand Voice',
    icon: 'bi-mic',
    color: '#ec4899',
    description: 'Voice traits, do\u2019s and don\u2019ts from the Brand Voice Trainer.',
    items: [
      { id: 'vo-traits', label: 'Voice Traits', content: 'Elegant, warm, confident, heritage-aware.' },
      { id: 'vo-dos', label: 'Voice Do\u2019s', content: 'Use "timeless", "curated", "craft". Tell short stories. Speak directly to the reader.' },
      { id: 'vo-donts', label: 'Voice Don\u2019ts', content: 'Avoid "cheap", "budget", sale-y urgency and FOMO language.' },
    ],
  },
  {
    id: 'library',
    label: 'Prompt Library',
    icon: 'bi-journal-text',
    color: '#14b8a6',
    description: 'Few-shot examples and proven prompts.',
    items: [
      { id: 'lib-ig-example', label: 'Few-shot Example — IG Post', content: 'Input: silk kurta. Output: "Meet the kurta that moves with you…" + 5 hashtags + question.' },
      { id: 'lib-reel-example', label: 'Few-shot Example — Reel', content: 'Input: monsoon lookbook. Output: hook "Rain-ready, not rain-ruined" → 4 visual beats → CTA.' },
    ],
  },
];

export interface PromptEstimate {
  tokens: number;
  cost: number;
}

export const PROMPT_COST_PER_1K = 0.015;

export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

export function estimatePromptCost(tokens: number): number {
  return (tokens / 1000) * PROMPT_COST_PER_1K;
}