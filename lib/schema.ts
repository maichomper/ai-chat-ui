// Using simple types since we're not using DB
export type Vote = {
  id: string;
  messageId: string;
  chatId: string;
  userId: string;
  value: number;
  createdAt: Date;
}

export type Suggestion = {
  id: string;
  content: string;
  createdAt: Date;
} 