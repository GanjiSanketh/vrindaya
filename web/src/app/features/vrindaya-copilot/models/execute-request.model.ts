import { ChatAttachment } from './chat-message.model';

export interface ExecuteSettings {
  tone?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExecuteRequest {
  conversationId: string;
  message: string;
  selectedProductId?: string;
  platform?: string;
  contentType?: string;
  goal?: string;
  attachments?: ChatAttachment[];
  settings?: ExecuteSettings;
}
