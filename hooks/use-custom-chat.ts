import { useState, useCallback, useRef } from 'react';
import { Message, UIMessage, ChatRequestOptions, CreateMessage } from 'ai';
import { generateUUID } from '@/lib/utils';

type ChatStatus = 'streaming' | 'error' | 'submitted' | 'ready';

interface UseCustomChatOptions {
  id?: string;
  initialMessages?: UIMessage[];
  onFinish?: () => void;
  onError?: (error: Error) => void;
  setId?: (id: string) => void;
}

interface UseCustomChatHelpers {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
  input: string;
  setInput: (input: string | ((input: string) => string)) => void;
  handleSubmit: (event?: React.FormEvent<HTMLFormElement>, chatRequestOptions?: ChatRequestOptions) => void;
  isLoading: boolean;
  stop: () => void;
  append: (message: Message | CreateMessage, chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
  status: ChatStatus;
}

export function useCustomChat({
  id,
  initialMessages = [],
  onFinish,
  onError,
  setId,
}: UseCustomChatOptions = {}): UseCustomChatHelpers {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('ready');
    }
  }, []);

  const append = useCallback(async (message: Message | CreateMessage, chatRequestOptions?: ChatRequestOptions) => {
    const newMessage: UIMessage = {
      ...message,
      id: message.id || generateUUID(),
      createdAt: message.createdAt || new Date(),
      parts: [{ type: 'text', text: message.content }],
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>, options?: ChatRequestOptions) => {
      console.log('handleSubmit triggered');
      e?.preventDefault();
      if (!input.trim() || status === 'submitted') return;

      console.log('Starting handleSubmit with messages:', messages);

      const userMessage: UIMessage = {
        id: generateUUID(),
        content: input,
        role: 'user',
        createdAt: new Date(),
        parts: [{ type: 'text', text: input }],
      };

      const assistantMessage: UIMessage = {
        id: generateUUID(),
        content: '',
        role: 'assistant',
        createdAt: new Date(),
        parts: [{ type: 'text', text: '' }],
      };

      console.log('Adding messages:', { userMessage, assistantMessage });
      setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
      setInput('');
      setStatus('streaming');

      try {
        abortControllerRef.current = new AbortController();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            ...options?.body,
          }),
          signal: abortControllerRef.current.signal,
        });

        console.log('Starting to read stream');

        if (!response.ok) {
          console.error('Response not ok:', response.status);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.error('No reader available');
          return;
        }

        console.log('Starting to read stream...');
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          console.log('Read chunk:', { done, hasValue: !!value });

          if (done) {
            console.log('Stream complete');
            break;
          }

          const text = new TextDecoder().decode(value);
          console.log('Decoded text:', text);

          const lines = text.split('\n\n').filter(line => line.trim());
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = JSON.parse(line.replace('data: ', ''));
            console.log('Parsed event in useCustomChat:', data);

            if (data.type === 'conversation_id') {
              console.log('Received conversation ID:', data.data.conversation_id);
              if (setId) {
                setId(data.data.conversation_id);
              }
              window.history.replaceState({}, '', `/chat/${data.data.conversation_id}`);
            } else if (data.type === 'text-delta') {
              // Handle text-delta events (converted from raw_response_event)
              const deltaContent = data.content ?? data.text;
              if (deltaContent === undefined) {
                console.error('Received text-delta event with no content or text');
                return;
              }
              
              console.log('Processing text delta:', deltaContent);
              accumulatedContent += deltaContent;
              console.log('useCustomChat - Accumulated content:', accumulatedContent);

              setMessages(prevMessages => {
                console.log('Current messages state:', prevMessages);
                const newMessages = [...prevMessages];
                const lastMessage = newMessages[newMessages.length - 1];
                console.log('Last message:', lastMessage);
                
                // Only update if we have content to add
                if (!accumulatedContent) {
                  console.log('No content to add, keeping current messages');
                  return prevMessages;
                }
                
                if (!lastMessage || lastMessage.role !== 'assistant') {
                  console.log('Creating new assistant message');
                  newMessages.push({
                    id: generateUUID(),
                    content: accumulatedContent,
                    role: 'assistant',
                    createdAt: new Date(),
                    parts: [{ type: 'text', text: accumulatedContent }],
                  });
                } else {
                  console.log('Updating existing assistant message');
                  lastMessage.content = accumulatedContent;
                  lastMessage.parts = [{ type: 'text', text: accumulatedContent }];
                }
                
                console.log('Updated messages:', newMessages);
                return newMessages;
              });
              setStatus('streaming');
            } else if (data.type === 'run_item_stream_event') {
              // Just mark as complete, don't create new message
              console.log('Received complete message event');
              setStatus('ready');
              onFinish?.();
            } else if (data.type === 'finish') {
              console.log('Received finish event');
              setStatus('ready');
              onFinish?.();
            }
          }
        }

        setStatus('ready');
        onFinish?.();
      } catch (error) {
        console.error('Error in stream processing:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          setStatus('ready');
          return;
        }
        setStatus('error');
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [input, messages, status, onFinish, onError]
  );

  return {
    messages,
    setMessages,
    input,
    setInput,
    handleSubmit,
    isLoading: status === 'submitted' || status === 'streaming',
    stop,
    append,
    status,
  };
} 