import { ChatMessage } from './chat-message.model';

export type ConversationStatus = 'active' | 'archived' | 'completed';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  selectedProductId?: string;
  platform?: string;
  goal?: string;
  status: ConversationStatus;
}
