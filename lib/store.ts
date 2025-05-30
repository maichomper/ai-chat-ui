import { Message } from 'ai';
import { VisibilityType } from '@/components/visibility-selector';
import { create } from 'zustand';
import { ChatMessage as ApiChatMessage, Conversation } from './api/types';

// Types
interface StoreChatMessage extends Message {
  id: string;
  chatId: string;
  createdAt: Date;
  visibility?: VisibilityType;
  userId?: string;
}

interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  visibility: VisibilityType;
}

// Using simple types since we're not using DB
interface Document {
  id: string;
  chatId: string;
  content: string;
  createdAt: Date;
}

interface Suggestion {
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
}

interface Vote {
  id: string;
  messageId: string;
  chatId: string;
  userId: string;
  value: number;
  createdAt: Date;
}

// In-memory storage
const messages: StoreChatMessage[] = [];
const chats: Chat[] = [];
const documents: Document[] = [];
const suggestions: Suggestion[] = [];
const votes: Vote[] = [];

// Message operations
export async function getMessageById({ id }: { id: string }): Promise<StoreChatMessage[]> {
  return messages.filter(msg => msg.id === id);
}

export async function getMessagesByChatId({ chatId }: { chatId: string }): Promise<StoreChatMessage[]> {
  return messages.filter(msg => msg.chatId === chatId);
}

export async function saveMessage(message: Omit<StoreChatMessage, 'id'>): Promise<StoreChatMessage> {
  const newMessage: StoreChatMessage = {
    ...message,
    id: Math.random().toString(36).substring(7),
  };
  messages.push(newMessage);
  return newMessage;
}

export async function saveMessages(newMessages: Array<Omit<StoreChatMessage, 'id'>>): Promise<StoreChatMessage[]> {
  const savedMessages = await Promise.all(
    newMessages.map(message => saveMessage(message))
  );
  return savedMessages;
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

// Chat operations
export async function getChatById({ id }: { id: string }): Promise<Chat | undefined> {
  return chats.find(chat => chat.id === id);
}

export async function getChatsByUserId({ userId }: { userId: string }): Promise<Chat[]> {
  return chats.filter(chat => chat.userId === userId);
}

export async function saveChat(chat: Omit<Chat, 'id' | 'visibility'> & { visibility?: VisibilityType }): Promise<Chat> {
  const newChat: Chat = {
    ...chat,
    id: Math.random().toString(36).substring(7),
    visibility: chat.visibility || 'private',
  };
  chats.push(newChat);
  return newChat;
}

export async function deleteChatById({ id }: { id: string }): Promise<void> {
  const index = chats.findIndex(chat => chat.id === id);
  if (index !== -1) {
    // Remove the chat
    chats.splice(index, 1);
    // Remove all messages associated with this chat
    messages.splice(0, messages.length, ...messages.filter(msg => msg.chatId !== id));
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}): Promise<void> {
  const chat = chats.find(c => c.id === chatId);
  if (chat) {
    chat.visibility = visibility;
  }
}

// Document operations
export async function getDocumentById({ id }: { id: string }): Promise<Document | undefined> {
  return documents.find(doc => doc.id === id);
}

export async function saveDocument(document: Omit<Document, 'id'>): Promise<Document> {
  const newDocument: Document = {
    ...document,
    id: Math.random().toString(36).substring(7),
  };
  documents.push(newDocument);
  return newDocument;
}

// Suggestion operations
export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }): Promise<Suggestion[]> {
  return suggestions.filter(suggestion => suggestion.documentId === documentId);
}

export async function saveSuggestions(newSuggestions: Array<Omit<Suggestion, 'id'>>): Promise<Suggestion[]> {
  const savedSuggestions = newSuggestions.map(suggestion => ({
    ...suggestion,
    id: Math.random().toString(36).substring(7),
  }));
  suggestions.push(...savedSuggestions);
  return savedSuggestions;
}

// Vote operations
export async function getVotesByChatId({ chatId }: { chatId: string }): Promise<Vote[]> {
  return votes.filter(vote => vote.chatId === chatId);
}

export async function voteMessage({ 
  messageId, 
  chatId, 
  userId, 
  value 
}: { 
  messageId: string;
  chatId: string;
  userId: string;
  value: number;
}): Promise<Vote> {
  const newVote: Vote = {
    id: Math.random().toString(36).substring(7),
    messageId,
    chatId,
    userId,
    value,
    createdAt: new Date(),
  };
  votes.push(newVote);
  return newVote;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, ApiChatMessage[]>;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ApiChatMessage) => void;
  updateMessage: (conversationId: string, message: ApiChatMessage) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversations: [],
  messages: {},
  selectedConversationId: null,

  setSelectedConversationId: (id) => set({ selectedConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [...state.conversations, conversation],
    })),

  updateConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversation.id ? conversation : c
      ),
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== id)
      ),
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  updateMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.map((m) =>
          m.id === message.id ? message : m
        ) || [],
      },
    })),

  deleteMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.filter(
          (m) => m.id !== Number(messageId)
        ) || [],
      },
    })),
})); 