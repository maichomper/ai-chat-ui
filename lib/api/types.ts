// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Chat Types
export interface ChatMessage {
  id: number;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  message_order: number;
  agent_name: string | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  created_at: string;
  updated_at: string;
  visibility: 'private' | 'public';
}

export interface ConversationsResponse {
  conversations: ConversationSummary[];
  total: number;
  limit: number;
  offset: number;
}

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// API Request Types
export interface SendMessageRequest {
  messages: Array<{ content: string; role: string }>;
  id?: string | null;
}

export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
}

// SSE Event Types
export interface ConversationIdEvent {
  type: 'conversation_id';
  data: {
    conversation_id: string;
  };
}

export interface StatusEvent {
  type: 'status_event';
  data: {
    status: 'processing_started' | 'completed' | 'tool_started' | 'tool_completed' | 'agent_changed';
    message: string;
  };
}

export interface AgentUpdatedEvent {
  type: 'agent_updated_stream_event';
  data: {
    agent_name: string;
  };
}

export interface RawResponseEvent {
  type: 'raw_response_event';
  data: {
    delta: string;
  };
}

export interface TextDeltaEvent {
  type: 'text-delta';
  content?: string;
  text?: string;
}

export interface FinishEvent {
  type: 'finish';
  content: string;
}

export interface RunItemStreamEvent {
  type: 'run_item_stream_event';
  data: {
    item_type: 'message_output_item';
    text: string;
  };
}

export type ChatEvent = {
  type: 'conversation_id' | 'raw_response_event' | 'status_event' | 'agent_updated_stream_event' | 'run_item_stream_event';
  data: {
    conversation_id?: string;
    delta?: string;
    status?: 'processing_started' | 'completed' | 'tool_started' | 'tool_completed' | 'agent_changed';
    message?: string;
    agent_name?: string;
    item_type?: string;
    tool_name?: string;
    arguments?: any;
    output?: any;
  };
};

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  visibility: 'private' | 'public';
  userId: string;
} 