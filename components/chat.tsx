'use client';

import type { Message } from '@ai-sdk/react';
import type { Attachment } from 'ai';
import { useState, useEffect, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/schema';
import { fetcher } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { ToolFeedbackDisplay } from './tool-feedback';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';

type AgentData = {
  [key: string]: any;
  agent: {
    name: string;
  };
}

type ToolFeedback = {
  type: 'tool_status';
  action: 'start' | 'end' | 'call' | 'result';
  message: string;
  tool: string;
  args?: Record<string, any> | null;
  output?: any;
}

export function Chat({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { status } = useSession();
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [messageToolFeedback, setMessageToolFeedback] = useState<Map<string, ToolFeedback[]>>(new Map());
  const [previousDataLength, setPreviousDataLength] = useState(0);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    setMessages,
    append,
    setInput,
    data
  } = useChat({
    id,
    initialMessages,
    api: '/api/chat',
    streamProtocol: 'data',
    headers: {
      'x-vercel-ai-data-stream': 'v1'
    },
    onFinish: () => {
      mutate('/api/history');
    },
    onError: (error) => {
      toast.error('An error occurred, please try again!');
    },
  });

  // Track agent changes
  useEffect(() => {
    if (data) {
      const agentData = data.find((item): item is AgentData => 
        typeof item === 'object' && item !== null && 'agent' in item && typeof (item as any).agent?.name === 'string'
      );
      if (agentData?.agent && agentData.agent.name !== currentAgent) {
        setCurrentAgent(agentData.agent.name);
        console.log('Agent changed to:', agentData.agent.name);
      }
    }
  }, [data, currentAgent]);

  // Track tool feedback per message - only process new data
  useEffect(() => {
    if (data && messages.length > 0) {
      const currentDataLength = data.length;
      
      // Only process new data items that came in since last update
      const newDataItems = data.slice(previousDataLength);
      
      const newFeedbackData = newDataItems
        .filter((item: any): item is { feedback: ToolFeedback } => 
          typeof item === 'object' && 
          item !== null && 
          'feedback' in item &&
          item.feedback.type === 'tool_status'
        )
        .map(item => item.feedback);

      if (newFeedbackData.length > 0) {
        // Associate new tool feedback with the current message being streamed
        const currentMessageId = messages[messages.length - 1]?.id;
        if (currentMessageId) {
          setMessageToolFeedback(prev => {
            const newMap = new Map(prev);
            const existingFeedback = newMap.get(currentMessageId) || [];
            newMap.set(currentMessageId, [...existingFeedback, ...newFeedbackData]);
            return newMap;
          });
        }
      }
      
      // Update the previous data length
      setPreviousDataLength(currentDataLength);
    }
  }, [data, messages, previousDataLength]);

  // Reset data tracking when starting a new message
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      // When starting to stream a new message, reset the data tracking
      const currentMessageId = messages[messages.length - 1]?.id;
      if (currentMessageId && !messageToolFeedback.has(currentMessageId)) {
        // This is a new message, clear its tool feedback
        setMessageToolFeedback(prev => {
          const newMap = new Map(prev);
          newMap.set(currentMessageId, []);
          return newMap;
        });
      }
    }
  }, [isLoading, messages, messageToolFeedback]);

  const handleInput = useCallback((value: string | ((prev: string) => string)) => {
    if (typeof value === 'function') {
      setInput(value(input));
    } else {
      setInput(value);
    }
  }, [input, setInput]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-gray-200">
        <ChatHeader chatId={id} />
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-hidden">
          <Messages
            chatId={id}
            status={isLoading ? 'streaming' : error ? 'error' : 'ready'}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={async () => {
              window.location.reload();
              return null;
            }}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
            messageToolFeedback={messageToolFeedback}
          />
        </div>
        
        {/* Floating input - truly floating at bottom of chat window */}
        <div className="sticky bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border p-4 pointer-events-auto">
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={handleInput}
            status={isLoading ? 'streaming' : error ? 'error' : 'ready'}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
