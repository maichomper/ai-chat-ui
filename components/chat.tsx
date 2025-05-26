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
  action: 'start' | 'end';
  message: string;
  tool: string;
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
  const [toolFeedback, setToolFeedback] = useState<ToolFeedback[]>([]);
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

  // Track tool feedback
  useEffect(() => {
    if (data) {
      const feedbackData = data
        .filter((item: any): item is { feedback: ToolFeedback } => 
          typeof item === 'object' && 
          item !== null && 
          'feedback' in item &&
          item.feedback.type === 'tool_status'
        )
        .map(item => item.feedback);

      if (feedbackData.length > 0) {
        setToolFeedback(feedbackData);
      }
    }
  }, [data]);

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
        {currentAgent && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full animate-fade-in">
            {currentAgent}
          </span>
        )}
      </div>

      <ToolFeedbackDisplay feedback={toolFeedback} />

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
      />
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
  );
}
