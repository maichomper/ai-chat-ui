import { ApiError, ChatEvent, ChatMessage, Conversation, ConversationsResponse, GetConversationsRequest, SendMessageRequest } from './types';
import { headers } from 'next/headers';
import { signOut } from 'next-auth/react';

const API_BASE_URL = process.env.HARVEST_API_URL || 'http://localhost:8000';

class ChatApi {
  private async fetchWithAuth(url: string, accessToken: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        if (response.status === 401) {
          console.log('Auth error detected in fetchWithAuth');
          // Sign out the user which will clear the session and cookies
          await signOut({ redirect: true, callbackUrl: '/login' });
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(error.message || `API request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        console.error('API request failed:', error.message);
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async sendMessage(
    request: SendMessageRequest,
    accessToken: string,
  ): Promise<ReadableStream> {
    try {
      // Use the same token formatting logic as fetchWithAuth
      const cleanToken = accessToken.trim().replace(/^Bearer\s+/, '');
      const formattedToken = `Bearer ${cleanToken}`;

      console.log('Making request to:', `${API_BASE_URL}/chat`);
      console.log('Using token of length:', formattedToken.length);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': formattedToken,
        },
        body: JSON.stringify({
          message: request.messages[request.messages.length - 1].content,
          conversation_id: request.id || undefined,
        }),
      });

      console.log('API Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API error response:', errorText);
        let error: ApiError;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText };
        }
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please try logging in again.');
        }
        
        throw new Error(error.message || `API request failed with status ${response.status}`);
      }

      // Transform the SSE stream into a format useChat expects
      return new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            console.error('No response body available');
            throw new Error('No response body');
          }

          console.log('Starting to read SSE stream');
          let isStreamActive = true;
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();

          try {
            let buffer = '';
            while (isStreamActive) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('Reader signaled done');
                break;
              }

              const chunk = decoder.decode(value);
              console.log('Received chunk:', chunk);
              buffer += chunk;

              // Process complete messages
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                
                try {
                  const event: ChatEvent = JSON.parse(line.slice(6));
                  console.log('Parsed event:', event);
                  
                  switch (event.type) {
                    case 'conversation_id':
                      // Send conversation ID as data
                      await controller.enqueue(encoder.encode(`2:[{"conversation_id":"${event.data.conversation_id}"}]\n`));
                      break;
                    case 'raw_response_event':
                      // Send text content
                      await controller.enqueue(encoder.encode(`0:${JSON.stringify(event.data.delta)}\n`));
                      break;
                    case 'status_event':
                      if (event.data.status === 'completed') {
                        // Send finish message part
                        await controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
                        isStreamActive = false;
                        controller.close();
                      } else if (event.data.status === 'tool_started') {
                        // Send tool started feedback with specific tool message and arguments
                        const toolArgs = event.data.message?.match(/Tool arguments: "(.*?)"/)?.[1];
                        await controller.enqueue(encoder.encode(`2:[{"feedback":{"type":"tool_status","action":"start","message":"🔧 ${event.data.message?.split('"')[0] || ''}","tool":"${event.data.tool_name || 'unknown'}", "args": ${toolArgs ? toolArgs : "null"}}}]\n`));
                      } else if (event.data.status === 'tool_completed') {
                        // Send tool completed feedback
                        await controller.enqueue(encoder.encode(`2:[{"feedback":{"type":"tool_status","action":"end","message":"✨ Tool operation complete","tool":"${event.data.tool_name || 'unknown'}"}}]\n`));
                      }
                      break;
                    case 'run_item_stream_event':
                      if (event.data.item_type === 'tool_call_item') {
                        // Send tool call with arguments
                        await controller.enqueue(encoder.encode(`2:[{"feedback":{"type":"tool_status","action":"call","message":"📋 Tool call arguments","tool":"${event.data.tool_name || 'unknown'}", "args": ${event.data.arguments || "null"}}}]\n`));
                      } else if (event.data.item_type === 'tool_call_output_item') {
                        // Send tool output result
                        await controller.enqueue(encoder.encode(`2:[{"feedback":{"type":"tool_status","action":"result","message":"📤 Tool output","tool":"${event.data.tool_name || 'unknown'}", "output": ${JSON.stringify(event.data.output || null)}}}]\n`));
                      }
                      break;
                    case 'agent_updated_stream_event':
                      // Send agent information as data
                      await controller.enqueue(encoder.encode(`2:[{"agent":{"name":"${event.data.agent_name}"}}]\n`));
                      break;
                  }
                } catch (parseError) {
                  console.error('Error parsing event:', parseError);
                  // Continue processing other events even if one fails to parse
                  continue;
                }
              }
            }
          } catch (error) {
            console.error('Error in stream processing:', error);
            controller.error(error);
          } finally {
            console.log('Stream processing finished');
          }
        },
        cancel() {
          console.log('Stream cancelled by consumer');
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('Authentication failed. Please try logging in again.');
        }
      }
      throw error;
    }
  }

  async getConversations(params: GetConversationsRequest = {}, accessToken: string): Promise<ConversationsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    console.log('[SERVER] getConversations - Making request to:', `${API_BASE_URL}/conversations?${queryParams.toString()}`);
    
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations?${queryParams.toString()}`,
      accessToken
    );

    const data = await response.json();
    console.log('[SERVER] getConversations - Response:', JSON.stringify(data, null, 2));
    
    return data;
  }

  async getConversation(id: string, accessToken: string): Promise<Conversation> {
    const response = await this.fetchWithAuth(`/conversations/${id}`, accessToken);
    return response.json();
  }

  async getMessages(conversationId: string, accessToken: string): Promise<ChatMessage[]> {
    const response = await this.fetchWithAuth(`/chat/${conversationId}/messages`, accessToken);
    return response.json();
  }

  async deleteConversation(id: string, accessToken: string): Promise<void> {
    await this.fetchWithAuth(`/conversations/${id}`, accessToken, {
      method: 'DELETE',
    });
  }

  async getConversationHistory(conversationId: string, accessToken: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    try {
      const response = await this.fetchWithAuth(
        `${API_BASE_URL}/chat/${conversationId}/history`,
        accessToken
      );

      const data = await response.json();

      if (!data) {
        throw new Error('Conversation not found');
      }

      // Create a default conversation object since we don't get it from the API
      const conversation: Conversation = {
        id: conversationId,
        title: data[0]?.content.slice(0, 50) || 'New Chat', // Use first message as title
        created_at: data[0]?.created_at || new Date().toISOString(),
        updated_at: data[data.length - 1]?.created_at || new Date().toISOString(),
        visibility: 'private',
        userId: '', // This will be set by the page component
      };

      return { conversation, messages: data };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('Conversation not found')) {
          throw new Error('Conversation not found');
        }
        if (error.name === 'AuthError') {
          throw error;
        }
      }
      throw error;
    }
  }
}

export const chatApi = new ChatApi(); 