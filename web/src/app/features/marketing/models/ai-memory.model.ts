export type MemoryCategory =
  | 'Brand Information'
  | 'Products'
  | 'Previous Campaigns'
  | 'Successful Posts'
  | 'Failed Posts'
  | 'Customer Feedback'
  | 'Top Performing Hashtags'
  | 'Writing Style'
  | 'Image Style';

export interface MemoryField {
  key: string;
  label: string;
  type: 'text' | 'textarea';
}

export interface MemoryCategoryMeta {
  id: MemoryCategory;
  icon: string;
  color: string;
  description: string;
  fields: MemoryField[];
}

export interface AiMemoryEntry {
  id: string;
  category: MemoryCategory;
  title: string;
  fields: Record<string, string>;
  tags: string[];
  source: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export type AiMemoryDraft = Omit<AiMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>;

export const MEMORY_SOURCES = ['Manual', 'Campaign', 'Analytics', 'Customer', 'Brand Kit'] as const;

export const MEMORY_CATEGORIES: MemoryCategoryMeta[] = [
  {
    id: 'Brand Information',
    icon: 'bi-tags',
    color: '#0f6f84',
    description: 'Core identity — mission, values, positioning and audience.',
    fields: [
      { key: 'brandName', label: 'Brand Name', type: 'text' },
      { key: 'mission', label: 'Mission', type: 'textarea' },
      { key: 'values', label: 'Values', type: 'textarea' },
      { key: 'positioning', label: 'Positioning', type: 'textarea' },
      { key: 'targetAudience', label: 'Target Audience', type: 'text' },
    ],
  },
  {
    id: 'Products',
    icon: 'bi-bag-heart',
    color: '#c9a54c',
    description: 'Structured details of products the AI should know.',
    fields: [
      { key: 'productName', label: 'Product Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'materials', label: 'Materials / Fabric', type: 'text' },
      { key: 'priceRange', label: 'Price Range', type: 'text' },
      { key: 'sellingPoints', label: 'Selling Points', type: 'textarea' },
    ],
  },
  {
    id: 'Previous Campaigns',
    icon: 'bi-megaphone',
    color: '#8b5cf6',
    description: 'Past campaigns, their goals and outcomes.',
    fields: [
      { key: 'campaignName', label: 'Campaign Name', type: 'text' },
      { key: 'channel', label: 'Channel', type: 'text' },
      { key: 'goal', label: 'Goal', type: 'text' },
      { key: 'result', label: 'Result', type: 'textarea' },
    ],
  },
  {
    id: 'Successful Posts',
    icon: 'bi-graph-up-arrow',
    color: '#22c55e',
    description: 'Posts that performed well and why.',
    fields: [
      { key: 'postTitle', label: 'Post Title', type: 'text' },
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'engagement', label: 'Engagement', type: 'text' },
      { key: 'lesson', label: 'Why It Worked', type: 'textarea' },
    ],
  },
  {
    id: 'Failed Posts',
    icon: 'bi-graph-down-arrow',
    color: '#ef4444',
    description: 'Posts that underperformed — and what to avoid.',
    fields: [
      { key: 'postTitle', label: 'Post Title', type: 'text' },
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'issue', label: 'What Went Wrong', type: 'textarea' },
      { key: 'lesson', label: 'Lesson', type: 'textarea' },
    ],
  },
  {
    id: 'Customer Feedback',
    icon: 'bi-chat-quote',
    color: '#6366f1',
    description: 'What customers love and want improved.',
    fields: [
      { key: 'customerType', label: 'Customer Type', type: 'text' },
      { key: 'praise', label: 'Praise', type: 'textarea' },
      { key: 'complaint', label: 'Complaints / Requests', type: 'textarea' },
      { key: 'source', label: 'Feedback Source', type: 'text' },
    ],
  },
  {
    id: 'Top Performing Hashtags',
    icon: 'bi-hash',
    color: '#0ea5e9',
    description: 'Hashtags that delivered reach and engagement.',
    fields: [
      { key: 'hashtag', label: 'Hashtag', type: 'text' },
      { key: 'reach', label: 'Reach / Performance', type: 'text' },
      { key: 'note', label: 'When To Use', type: 'text' },
    ],
  },
  {
    id: 'Writing Style',
    icon: 'bi-pencil-square',
    color: '#ec4899',
    description: 'Language patterns, phrases and voice rules.',
    fields: [
      { key: 'element', label: 'Element', type: 'text' },
      { key: 'example', label: 'Example', type: 'textarea' },
      { key: 'rule', label: 'Rule', type: 'textarea' },
    ],
  },
  {
    id: 'Image Style',
    icon: 'bi-image',
    color: '#f59e0b',
    description: 'Visual direction — mood, palette and guidelines.',
    fields: [
      { key: 'styleName', label: 'Style Name', type: 'text' },
      { key: 'mood', label: 'Mood', type: 'text' },
      { key: 'palette', label: 'Colour Palette', type: 'text' },
      { key: 'guidelines', label: 'Guidelines', type: 'textarea' },
    ],
  },
];

export const MEMORY_CATEGORY_META: Record<MemoryCategory, MemoryCategoryMeta> =
  MEMORY_CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<MemoryCategory, MemoryCategoryMeta>);