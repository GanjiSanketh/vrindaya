import { WorkspaceMessage } from './workspace-message.model';
export type { WorkspaceMessage };

export type WorkspaceStatus = 'active' | 'archived';

export interface Workspace {
  id: string;
  name: string;
  userId: string;
  status: WorkspaceStatus;
  currentModule: string;
  messages: WorkspaceMessage[];
  context: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  status: WorkspaceStatus;
  currentModule: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  userId: string;
  currentModule?: string;
  context?: Record<string, string>;
}

export interface SendMessageRequest {
  content: string;
  context?: Record<string, string>;
}

export type OrchestratorModuleKey =
  | 'content'
  | 'campaign'
  | 'image'
  | 'prompt'
  | 'knowledge'
  | 'memory'
  | 'trend'
  | 'seo'
  | 'performance'
  | 'recommendation';

export type ModuleState = 'ready' | 'busy' | 'degraded';

export interface OrchestratorModule {
  key: OrchestratorModuleKey;
  name: string;
  icon: string;
  color: string;
  role: string;
  input: string;
  output: string;
  state: ModuleState;
  enabled: boolean;
  calls: number;
  latency: number;
}

export interface OrchestrationRoute {
  key: string;
  label: string;
  icon: string;
  path: OrchestratorModuleKey[];
}

export interface OrchestratorEnvelope {
  requestId: string;
  route: string;
  path: OrchestratorModuleKey[];
  duration: number;
  status: string;
  timestamp: string;
}

export interface OrchestratorLogEntry {
  time: string;
  requestId: string;
  text: string;
  ok: boolean;
}

export const ORCHESTRATOR_MODULES: OrchestratorModule[] = [
  {
    key: 'prompt', name: 'Prompt Builder', icon: 'bi-code-slash', color: '#6366f1',
    role: 'Assembles structured, provider-agnostic prompts from orchestrated instructions.',
    input: 'Strategy + context', output: 'Structured prompt',
    state: 'ready', enabled: true, calls: 1284, latency: 120,
  },
  {
    key: 'knowledge', name: 'Knowledge Engine', icon: 'bi-book', color: '#3b82f6',
    role: 'Retrieves brand, fabric and trend knowledge to ground every generation.',
    input: 'Query tokens', output: 'Knowledge context',
    state: 'ready', enabled: true, calls: 3210, latency: 95,
  },
  {
    key: 'memory', name: 'Brand Memory', icon: 'bi-database-gear', color: '#8b5cf6',
    role: 'Recalls long-term brand learnings, voice and historical decisions.',
    input: 'Recall key', output: 'Brand memory snapshot',
    state: 'ready', enabled: true, calls: 1480, latency: 88,
  },
  {
    key: 'content', name: 'Content Generator', icon: 'bi-file-text', color: '#0f6f84',
    role: 'Generates captions, posts, scripts and copy from orchestrated instructions.',
    input: 'Prompt + context', output: 'Content draft',
    state: 'ready', enabled: true, calls: 1890, latency: 640,
  },
  {
    key: 'campaign', name: 'Campaign Generator', icon: 'bi-megaphone', color: '#c9a54c',
    role: 'Builds campaign structures, cadence and channel plans end to end.',
    input: 'Goal + trend context', output: 'Campaign plan',
    state: 'ready', enabled: true, calls: 410, latency: 820,
  },
  {
    key: 'image', name: 'Image Generator', icon: 'bi-image', color: '#22c55e',
    role: 'Creates image prompts and coordinates visual direction.',
    input: 'Visual brief', output: 'Image prompt set',
    state: 'ready', enabled: true, calls: 980, latency: 560,
  },
  {
    key: 'trend', name: 'Trend Analyzer', icon: 'bi-graph-up-arrow', color: '#f59e0b',
    role: 'Surfaces current market and social trends with confidence scoring.',
    input: 'Market signals', output: 'Trend insights',
    state: 'ready', enabled: true, calls: 355, latency: 430,
  },
  {
    key: 'seo', name: 'SEO Optimizer', icon: 'bi-search-heart', color: '#0ea5e9',
    role: 'Optimizes content for search, meta and discoverability.',
    input: 'Content draft', output: 'SEO-optimized copy',
    state: 'ready', enabled: true, calls: 720, latency: 310,
  },
  {
    key: 'performance', name: 'Performance Analyzer', icon: 'bi-bar-chart', color: '#14b8a6',
    role: 'Evaluates campaign and content results against goals.',
    input: 'Metrics feed', output: 'Performance report',
    state: 'ready', enabled: true, calls: 265, latency: 380,
  },
  {
    key: 'recommendation', name: 'Recommendation Engine', icon: 'bi-lightbulb', color: '#ec4899',
    role: 'Suggests next actions from orchestrated insights across modules.',
    input: 'Insights aggregate', output: 'Next-best actions',
    state: 'ready', enabled: true, calls: 1140, latency: 180,
  },
];

export const ORCHESTRATION_ROUTES: OrchestrationRoute[] = [
  { key: 'content-post', label: 'Generate Post', icon: 'bi-file-text', path: ['prompt', 'knowledge', 'memory', 'content', 'recommendation'] },
  { key: 'campaign', label: 'Create Campaign', icon: 'bi-megaphone', path: ['prompt', 'trend', 'knowledge', 'campaign', 'recommendation'] },
  { key: 'image', label: 'Generate Image', icon: 'bi-image', path: ['prompt', 'knowledge', 'memory', 'image', 'recommendation'] },
  { key: 'seo', label: 'Optimize for SEO', icon: 'bi-search-heart', path: ['knowledge', 'content', 'seo', 'recommendation'] },
  { key: 'trend', label: 'Trend Report', icon: 'bi-graph-up-arrow', path: ['trend', 'knowledge', 'recommendation'] },
  { key: 'performance', label: 'Performance Review', icon: 'bi-bar-chart', path: ['performance', 'memory', 'recommendation'] },
  { key: 'full', label: 'Full Pipeline', icon: 'bi-diagram-3', path: ['prompt', 'knowledge', 'memory', 'trend', 'content', 'image', 'seo', 'recommendation'] },
];

export function moduleByKey(key: OrchestratorModuleKey): OrchestratorModule {
  return ORCHESTRATOR_MODULES.find(m => m.key === key) ?? ORCHESTRATOR_MODULES[0];
}
