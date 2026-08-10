export interface WorkspaceMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  createdAt: string;
  module: string;
  context?: Record<string, string>;
}
