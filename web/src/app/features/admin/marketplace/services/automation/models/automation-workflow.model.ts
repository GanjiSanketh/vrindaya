import type { AutomationTask } from './automation-task.model';

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface WorkflowStep {
  name: string;
  description: string;
  order: number;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AutomationLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  step?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface AutomationScreenshot {
  id: string;
  step: string;
  label: string;
  dataUrl: string;
  timestamp: string;
  width: number;
  height: number;
}

export interface AutomationResult {
  listingUrl: string;
  marketplaceId: string;
  fsn: string;
  marketplaceStatus: string;
  publishedAt: string;
}

export interface WorkflowProgress {
  taskId: string;
  platform: string;
  action: string;
  status: AutomationTask['status'];
  steps: WorkflowStep[];
  logs: AutomationLog[];
  screenshots: AutomationScreenshot[];
  result: AutomationResult | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  estimatedSeconds: number;
  elapsedSeconds: number;
}

export const MARKETPLACE_WORKFLOWS = [
  { id: 'amazon', label: 'Amazon', url: 'sellercentral.amazon.in' },
  { id: 'flipkart', label: 'Flipkart', url: 'seller.flipkart.com' },
  { id: 'meesho', label: 'Meesho', url: 'supplier.meesho.com' },
  { id: 'myntra', label: 'Myntra', url: 'seller.myntra.com' },
  { id: 'ajio', label: 'AJIO', url: 'seller.ajio.com' },
] as const;

export const CREATE_LISTING_STEPS: readonly { name: string; description: string; estimatedSeconds: number }[] = [
  { name: 'Open Browser', description: 'Launch headless Chromium via Playwright', estimatedSeconds: 4 },
  { name: 'Navigate to Login', description: 'Open marketplace seller login page', estimatedSeconds: 3 },
  { name: 'Login', description: 'Fill credentials and submit login form', estimatedSeconds: 8 },
  { name: 'Navigate to Listings', description: 'Open listing management / add product page', estimatedSeconds: 5 },
  { name: 'Fill Attributes', description: 'Enter product attributes (category, brand, size, colour, fabric)', estimatedSeconds: 12 },
  { name: 'Fill Description', description: 'Enter product title and description', estimatedSeconds: 8 },
  { name: 'Fill SEO', description: 'Enter SEO keywords and meta data', estimatedSeconds: 6 },
  { name: 'Set Price', description: 'Configure MRP, selling price, discount', estimatedSeconds: 5 },
  { name: 'Set Stock', description: 'Configure available stock quantity', estimatedSeconds: 3 },
  { name: 'Upload Images', description: 'Upload product images', estimatedSeconds: 15 },
  { name: 'Publish Listing', description: 'Submit listing for marketplace review', estimatedSeconds: 8 },
  { name: 'Capture Result', description: 'Extract listing URL, marketplace ID, and FSN', estimatedSeconds: 3 },
];
