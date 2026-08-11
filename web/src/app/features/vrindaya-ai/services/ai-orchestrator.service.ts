import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OrchestratorModule, OrchestrationRoute } from '../models/workspace.model';
import {
  Workspace,
  WorkspaceSummary,
  CreateWorkspaceRequest,
  SendMessageRequest,
} from '../models/workspace.model';

const ORCHESTRATION_ROUTES: OrchestrationRoute[] = [
  { key: 'content-post', label: 'Generate Post', icon: 'bi-file-text', path: ['prompt', 'knowledge', 'memory', 'content', 'recommendation'] },
  { key: 'campaign', label: 'Create Campaign', icon: 'bi-megaphone', path: ['prompt', 'trend', 'knowledge', 'campaign', 'recommendation'] },
  { key: 'image', label: 'Generate Image', icon: 'bi-image', path: ['prompt', 'knowledge', 'memory', 'image', 'recommendation'] },
  { key: 'seo', label: 'Optimize for SEO', icon: 'bi-search-heart', path: ['knowledge', 'content', 'seo', 'recommendation'] },
  { key: 'trend', label: 'Trend Report', icon: 'bi-graph-up-arrow', path: ['trend', 'knowledge', 'recommendation'] },
  { key: 'performance', label: 'Performance Review', icon: 'bi-bar-chart', path: ['performance', 'memory', 'recommendation'] },
  { key: 'full', label: 'Full Pipeline', icon: 'bi-diagram-3', path: ['prompt', 'knowledge', 'memory', 'trend', 'content', 'image', 'seo', 'recommendation'] },
];

const ORCHESTRATOR_MODULES: OrchestratorModule[] = [
  { key: 'prompt', name: 'Prompt Builder', icon: 'bi-code-slash', color: '#6366f1', role: 'Assembles structured, provider-agnostic prompts from orchestrated instructions.', input: 'Strategy + context', output: 'Structured prompt', state: 'ready', enabled: true, calls: 1284, latency: 120 },
  { key: 'knowledge', name: 'Knowledge Engine', icon: 'bi-book', color: '#3b82f6', role: 'Retrieves brand, fabric and trend knowledge to ground every generation.', input: 'Query tokens', output: 'Knowledge context', state: 'ready', enabled: true, calls: 3210, latency: 95 },
  { key: 'memory', name: 'Brand Memory', icon: 'bi-database-gear', color: '#8b5cf6', role: 'Recalls long-term brand learnings, voice and historical decisions.', input: 'Recall key', output: 'Brand memory snapshot', state: 'ready', enabled: true, calls: 1480, latency: 88 },
  { key: 'content', name: 'Content Generator', icon: 'bi-file-text', color: '#0f6f84', role: 'Generates captions, posts, scripts and copy from orchestrated instructions.', input: 'Prompt + context', output: 'Content draft', state: 'ready', enabled: true, calls: 1890, latency: 640 },
  { key: 'campaign', name: 'Campaign Generator', icon: 'bi-megaphone', color: '#c9a54c', role: 'Builds campaign structures, cadence and channel plans end to end.', input: 'Goal + trend context', output: 'Campaign plan', state: 'ready', enabled: true, calls: 410, latency: 820 },
  { key: 'image', name: 'Image Generator', icon: 'bi-image', color: '#22c55e', role: 'Creates image prompts and coordinates visual direction.', input: 'Visual brief', output: 'Image prompt set', state: 'ready', enabled: true, calls: 980, latency: 560 },
  { key: 'trend', name: 'Trend Analyzer', icon: 'bi-graph-up-arrow', color: '#f59e0b', role: 'Surfaces current market and social trends with confidence scoring.', input: 'Market signals', output: 'Trend insights', state: 'ready', enabled: true, calls: 355, latency: 430 },
  { key: 'seo', name: 'SEO Optimizer', icon: 'bi-search-heart', color: '#0ea5e9', role: 'Optimizes content for search, meta and discoverability.', input: 'Content draft', output: 'SEO-optimized copy', state: 'ready', enabled: true, calls: 720, latency: 310 },
  { key: 'performance', name: 'Performance Analyzer', icon: 'bi-bar-chart', color: '#14b8a6', role: 'Evaluates campaign and content results against goals.', input: 'Metrics feed', output: 'Performance report', state: 'ready', enabled: true, calls: 265, latency: 380 },
  { key: 'recommendation', name: 'Recommendation Engine', icon: 'bi-lightbulb', color: '#ec4899', role: 'Suggests next actions from orchestrated insights across modules.', input: 'Insights aggregate', output: 'Next-best actions', state: 'ready', enabled: true, calls: 1140, latency: 180 },
];

@Injectable({ providedIn: 'root' })
export class AiOrchestrator {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/ai/workspace`;

  readonly routes = ORCHESTRATION_ROUTES;
  readonly modules = ORCHESTRATOR_MODULES;

  getWorkspace(workspaceId: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.baseUrl}/${workspaceId}`);
  }

  listWorkspaces(userId: string): Observable<WorkspaceSummary[]> {
    return this.http.get<WorkspaceSummary[]>(`${this.baseUrl}?userId=${encodeURIComponent(userId)}`);
  }

  createWorkspace(request: CreateWorkspaceRequest): Observable<Workspace> {
    return this.http.post<Workspace>(this.baseUrl, request);
  }

  sendMessage(workspaceId: string, request: SendMessageRequest): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.baseUrl}/${workspaceId}/messages`, request);
  }

  updateContext(workspaceId: string, context: Record<string, string>): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.baseUrl}/${workspaceId}/context`, context);
  }

  archiveWorkspace(workspaceId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${workspaceId}/archive`, {});
  }

  deleteWorkspace(workspaceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${workspaceId}`);
  }
}
