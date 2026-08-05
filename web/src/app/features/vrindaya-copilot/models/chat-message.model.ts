export type ChatMessageRole = 'user' | 'ai';

export type ChatMessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  message: string;
  createdAt: string;
  status: ChatMessageStatus;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
}
