import { Message } from 'ai';
import { VisibilityType } from '@/components/visibility-selector';

interface ChatMessage extends Message {
  id: string;
  chatId: string;
  createdAt: Date;
  visibility?: VisibilityType;
}

// In-memory storage for chat messages
const messages: ChatMessage[] = [];

export async function getMessageById({ id }: { id: string }): Promise<ChatMessage[]> {
  return messages.filter(msg => msg.id === id);
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}): Promise<void> {
  const index = messages.findIndex(msg => msg.chatId === chatId && msg.createdAt >= timestamp);
  if (index !== -1) {
    messages.splice(index);
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}): Promise<void> {
  messages
    .filter(msg => msg.chatId === chatId)
    .forEach(msg => {
      msg.visibility = visibility;
    });
}

export async function saveMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
  const newMessage: ChatMessage = {
    ...message,
    id: Math.random().toString(36).substring(7),
  };
  messages.push(newMessage);
  return newMessage;
} 