import { cookies } from 'next/headers';
import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';
import type { UIMessage } from 'ai';

export default async function Page() {
  const id = generateUUID();
  const initialMessages: UIMessage[] = [];

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      isReadonly={false}
    />
  );
}
