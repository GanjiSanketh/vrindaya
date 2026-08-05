export type MarketingTool =
  | 'instagram-post' | 'instagram-reel' | 'facebook-post'
  | 'pinterest' | 'whatsapp-catalog' | 'caption' | 'hashtag' | 'seo'
  | 'blog' | 'flipkart' | 'landing' | 'email';

export type MarketingFieldKind = 'text' | 'textarea' | 'select' | 'toggle';

export interface MarketingFieldOption {
  value: string;
  label: string;
}

export interface MarketingPlatformField {
  key: string;
  label: string;
  placeholder?: string;
  kind: MarketingFieldKind;
  options?: MarketingFieldOption[];
  defaultValue: string | boolean;
}

export interface MarketingPlatform {
  id: MarketingTool;
  label: string;
  desc: string;
  icon: string;
  fields: MarketingPlatformField[];
}

const LENGTH_OPTIONS: MarketingFieldOption[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'detailed', label: 'Detailed' },
];

const CTA_OPTIONS: MarketingFieldOption[] = [
  { value: 'Shop Now', label: 'Shop Now' },
  { value: 'Learn More', label: 'Learn More' },
  { value: 'Read More', label: 'Read More' },
  { value: 'Discover Now', label: 'Discover Now' },
  { value: 'Get the Offer', label: 'Get the Offer' },
  { value: 'Subscribe', label: 'Subscribe' },
  { value: 'Contact Us', label: 'Contact Us' },
];

const TONE_OPTIONS: MarketingFieldOption[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'trendy', label: 'Trendy & Youthful' },
  { value: 'elegant', label: 'Elegant & Poetic' },
];

export const PRESET_LENGTH_OPTIONS = LENGTH_OPTIONS;
export const PRESET_CTA_OPTIONS = CTA_OPTIONS;
export const PRESET_TONE_OPTIONS = TONE_OPTIONS;

const toneField = (): MarketingPlatformField => ({
  key: 'tone',
  label: 'Tone',
  kind: 'select',
  options: TONE_OPTIONS,
  defaultValue: 'professional',
});

const keywordsField = (): MarketingPlatformField => ({
  key: 'keywords',
  label: 'Custom Keywords (comma separated)',
  placeholder: 'e.g. handwoven, summer wear, cotton',
  kind: 'text',
  defaultValue: '',
});

const audienceField = (): MarketingPlatformField => ({
  key: 'audience',
  label: 'Target Audience',
  placeholder: 'e.g. young professionals, brides-to-be',
  kind: 'text',
  defaultValue: '',
});

const ctaField = (): MarketingPlatformField => ({
  key: 'cta',
  label: 'Primary CTA',
  kind: 'select',
  options: CTA_OPTIONS,
  defaultValue: 'Shop Now',
});

const lengthField = (): MarketingPlatformField => ({
  key: 'length',
  label: 'Length',
  kind: 'select',
  options: LENGTH_OPTIONS,
  defaultValue: 'medium',
});

const subjectField = (): MarketingPlatformField => ({
  key: 'subject',
  label: 'Subject Line (optional)',
  placeholder: 'Leave blank to auto-generate',
  kind: 'text',
  defaultValue: '',
});

const headingField = (): MarketingPlatformField => ({
  key: 'heading',
  label: 'Hero Headline (optional)',
  placeholder: 'Leave blank to auto-generate',
  kind: 'text',
  defaultValue: '',
});

const emojisField = (): MarketingPlatformField => ({
  key: 'emojis',
  label: 'Include tasteful emojis',
  kind: 'toggle',
  defaultValue: false,
});

const hashtagsField = (): MarketingPlatformField => ({
  key: 'hashtags',
  label: 'Include relevant hashtags',
  kind: 'toggle',
  defaultValue: true,
});

export const MARKETING_PLATFORMS: MarketingPlatform[] = [
  {
    id: 'instagram-post',
    label: 'Instagram Post',
    desc: 'Caption, hashtags and engagement question for an Instagram feed post.',
    icon: 'bi-instagram',
    fields: [toneField(), emojisField(), hashtagsField()],
  },
  {
    id: 'instagram-reel',
    label: 'Instagram Reel',
    desc: 'Script with hook, visual directions, audio and CTA for a short-form Reel.',
    icon: 'bi-camera-reels',
    fields: [toneField(), audienceField()],
  },
  {
    id: 'facebook-post',
    label: 'Facebook Post',
    desc: 'Shareable headline, body copy and CTA for a Facebook post.',
    icon: 'bi-facebook',
    fields: [toneField(), hashtagsField(), ctaField()],
  },
  {
    id: 'pinterest',
    label: 'Pinterest Pin',
    desc: 'SEO title, description, board suggestions and hashtags for a Pin.',
    icon: 'bi-pinterest',
    fields: [toneField(), keywordsField()],
  },
  {
    id: 'whatsapp-catalog',
    label: 'WhatsApp Catalog',
    desc: 'Short name, description and CTA for a WhatsApp catalog item.',
    icon: 'bi-whatsapp',
    fields: [toneField(), ctaField()],
  },
  {
    id: 'caption',
    label: 'Caption',
    desc: 'Punchy one-line caption you can drop anywhere.',
    icon: 'bi-chat-quote',
    fields: [toneField(), emojisField()],
  },
  {
    id: 'hashtag',
    label: 'Hashtags',
    desc: 'Curated fashion hashtag pack for your product.',
    icon: 'bi-hash',
    fields: [keywordsField()],
  },
  {
    id: 'seo',
    label: 'SEO Meta',
    desc: 'Meta title, description, focus keyword and slug for web pages.',
    icon: 'bi-search-heart',
    fields: [toneField(), keywordsField()],
  },
  {
    id: 'blog',
    label: 'Website Blog',
    desc: 'Search-friendly blog article with sections, hooks and a CTA.',
    icon: 'bi-journal-text',
    fields: [toneField(), audienceField(), lengthField(), keywordsField()],
  },
  {
    id: 'flipkart',
    label: 'Flipkart Description',
    desc: 'Conversion-focused product listing copy targeted at Flipkart shoppers.',
    icon: 'bi-bag',
    fields: [toneField(), ctaField(), keywordsField()],
  },
  {
    id: 'landing',
    label: 'Landing Page',
    desc: 'Full website landing page copy with headline, sections and CTA.',
    icon: 'bi-window',
    fields: [toneField(), audienceField(), headingField(), lengthField(), ctaField(), keywordsField()],
  },
  {
    id: 'email',
    label: 'Email Marketing',
    desc: 'Subject line, body and single CTA for a marketing email.',
    icon: 'bi-envelope-paper',
    fields: [toneField(), subjectField(), audienceField(), lengthField(), ctaField()],
  },
];

export const MARKETING_TOOL_LABELS: Record<MarketingTool, string> =
  MARKETING_PLATFORMS.reduce((acc, p) => {
    acc[p.id] = p.label;
    return acc;
  }, {} as Record<MarketingTool, string>);

export const MARKETING_TOOL_ICONS: Record<MarketingTool, string> =
  MARKETING_PLATFORMS.reduce((acc, p) => {
    acc[p.id] = p.icon;
    return acc;
  }, {} as Record<MarketingTool, string>);