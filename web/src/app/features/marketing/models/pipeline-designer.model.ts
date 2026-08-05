export type PipelineNodeType =
  | 'brand'
  | 'product'
  | 'campaign'
  | 'prompt'
  | 'knowledge'
  | 'voice'
  | 'provider'
  | 'image'
  | 'review'
  | 'approval'
  | 'publish'
  | 'analytics';

export interface PipelineNodeTypeDef {
  key: PipelineNodeType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface PipelineNode {
  id: string;
  type: PipelineNodeType;
  x: number;
  y: number;
  enabled: boolean;
}

export interface PipelineEdge {
  id: string;
  from: string;
  to: string;
}

export interface PipelineDesign {
  id: string;
  name: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  updatedAt: string;
}

export const NODE_W = 168;
export const NODE_H = 96;

export const PIPELINE_NODE_TYPES: PipelineNodeTypeDef[] = [
  { key: 'brand', label: 'Brand Profile', icon: 'bi-person-badge', color: '#0f6f84', description: 'Brand identity, positioning and profile context.' },
  { key: 'product', label: 'Product', icon: 'bi-box-seam', color: '#3b82f6', description: 'Product catalog, details and imagery inputs.' },
  { key: 'campaign', label: 'Campaign', icon: 'bi-megaphone', color: '#c9a54c', description: 'Campaign goals, cadence and channel targets.' },
  { key: 'prompt', label: 'Prompt Builder', icon: 'bi-code-slash', color: '#6366f1', description: 'Assembles structured prompts from upstream context.' },
  { key: 'knowledge', label: 'Knowledge', icon: 'bi-book', color: '#0ea5e9', description: 'Fabric, fashion and market knowledge retrieval.' },
  { key: 'voice', label: 'Brand Voice', icon: 'bi-soundwave', color: '#8b5cf6', description: 'Tone, voice and messaging guardrails.' },
  { key: 'provider', label: 'AI Provider', icon: 'bi-hdd-network', color: '#14b8a6', description: 'Routes generation to a configured provider.' },
  { key: 'image', label: 'Image Generator', icon: 'bi-image', color: '#22c55e', description: 'Creates image prompts and visual assets.' },
  { key: 'review', label: 'Review', icon: 'bi-clipboard2-check', color: '#f59e0b', description: 'Scores and checks generated output quality.' },
  { key: 'approval', label: 'Approval', icon: 'bi-patch-check', color: '#ec4899', description: 'Manual or rule-based approval gate.' },
  { key: 'publish', label: 'Publishing', icon: 'bi-send', color: '#ef4444', description: 'Schedules and publishes final content.' },
  { key: 'analytics', label: 'Analytics', icon: 'bi-bar-chart', color: '#10b981', description: 'Tracks results and feeds performance back.' },
];

export function nodeTypeDef(type: PipelineNodeType): PipelineNodeTypeDef {
  return PIPELINE_NODE_TYPES.find(t => t.key === type) ?? PIPELINE_NODE_TYPES[0];
}