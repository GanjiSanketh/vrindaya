import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, throwError } from 'rxjs';
import { ExecutionEngineService } from '../engine/execution-engine.service';
import { ExecuteRequest } from '../models/execute-request.model';
import { ExecuteResponse } from '../models/execute-response.model';

export interface CopilotMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface CopilotConversation {
  id: string;
  title: string;
  messages: CopilotMessage[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CopilotService {
  private readonly http = inject(HttpClient);
  private readonly executionEngine = inject(ExecutionEngineService);

  sendMessage(message: string): Observable<CopilotMessage> {
    if (!message) {
      return throwError(() => new Error('Not Implemented'));
    }

    return this.executionEngine.executePrompt().pipe(
      map(() => ({
        role: 'ai' as const,
        content: 'Copilot is ready. AI provider integration is coming next.',
      })),
    );
  }

  executeCampaign(_request: ExecuteRequest): Observable<ExecuteResponse> {
    return this.executionEngine.executeCampaign();
  }

  getConversationHistory(): Observable<CopilotConversation[]> {
    return of([]);
  }

  clearConversation(): Observable<void> {
    return of(undefined);
  }
}
