import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CopilotService } from './services/copilot.service';
import { Conversation } from './models/conversation.model';
import { ChatMessage, ChatMessageRole, ChatMessageStatus } from './models/chat-message.model';
import { ExecuteRequest } from './models/execute-request.model';

@Component({
  selector: 'app-vrindaya-copilot-workspace',
  standalone: true,
  imports: [],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  private readonly copilotService = inject(CopilotService);

  readonly conversation = signal<Conversation | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly isThinking = signal(false);
  readonly selectedProduct = signal('');
  readonly selectedPlatform = signal('');
  readonly selectedGoal = signal('');

  sendMessage(text: string): void {
    const trimmed = text?.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = this.buildMessage('user', trimmed, 'complete');
    this.messages.update(current => [...current, userMessage]);
    this.isThinking.set(true);

    this.copilotService.sendMessage(trimmed).subscribe({
      next: reply => {
        const aiMessage = this.buildMessage('ai', reply.content, 'complete');
        this.messages.update(current => [...current, aiMessage]);
      },
      complete: () => this.isThinking.set(false),
      error: () => this.isThinking.set(false),
    });
  }

  executeCampaign(): void {
    const lastUserMessage = [...this.messages()].reverse().find(m => m.role === 'user');

    const request: ExecuteRequest = {
      conversationId: this.conversation()?.id ?? '',
      message: lastUserMessage?.message ?? '',
      selectedProductId: this.selectedProduct() || undefined,
      platform: this.selectedPlatform() || undefined,
      goal: this.selectedGoal() || undefined,
    };

    this.isThinking.set(true);
    this.copilotService.executeCampaign(request).subscribe({
      next: result => {
        const aiMessage = this.buildMessage('ai', result.response, 'complete');
        this.messages.update(current => [...current, aiMessage]);
      },
      complete: () => this.isThinking.set(false),
      error: () => this.isThinking.set(false),
    });
  }

  private buildMessage(role: ChatMessageRole, message: string, status: ChatMessageStatus): ChatMessage {
    return {
      id: `${role}-${Date.now()}`,
      role,
      message,
      createdAt: new Date().toISOString(),
      status,
    };
  }
}
