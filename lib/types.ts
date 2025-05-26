export interface Vote {
  id: string;
  chatId: string;
  messageId: string;
  userId: string;
  value: 'up' | 'down';
  createdAt: Date;
  isUpvoted?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  visibility: 'private' | 'public';
  createdAt: Date;
}

export interface DBMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

export interface Document {
  id: string;
  chatId: string;
  title: string;
  content: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  createdAt: Date;
}

export interface Suggestion {
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
} 