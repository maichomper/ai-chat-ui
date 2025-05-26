export interface Vote {
  id: string;
  messageId: string;
  chatId: string;
  userId: string;
  value: number;
  createdAt: Date;
}

export interface Suggestion {
  id: string;
  content: string;
  createdAt: Date;
} 