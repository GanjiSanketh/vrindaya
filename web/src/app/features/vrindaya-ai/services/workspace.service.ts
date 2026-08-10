import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workspace, WorkspaceSummary, CreateWorkspaceRequest, SendMessageRequest } from '../models/workspace.model';
import { AiOrchestrator } from './ai-orchestrator.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly orchestrator = inject(AiOrchestrator);

  get(workspaceId: string): Observable<Workspace> {
    return this.orchestrator.getWorkspace(workspaceId);
  }

  list(userId: string): Observable<WorkspaceSummary[]> {
    return this.orchestrator.listWorkspaces(userId);
  }

  create(request: CreateWorkspaceRequest): Observable<Workspace> {
    return this.orchestrator.createWorkspace(request);
  }

  sendMessage(workspaceId: string, request: SendMessageRequest): Observable<Workspace> {
    return this.orchestrator.sendMessage(workspaceId, request);
  }

  updateContext(workspaceId: string, context: Record<string, string>): Observable<Workspace> {
    return this.orchestrator.updateContext(workspaceId, context);
  }

  archive(workspaceId: string): Observable<void> {
    return this.orchestrator.archiveWorkspace(workspaceId);
  }

  delete(workspaceId: string): Observable<void> {
    return this.orchestrator.deleteWorkspace(workspaceId);
  }
}
