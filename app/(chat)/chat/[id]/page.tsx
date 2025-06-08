import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { chatApi } from '@/lib/api/chat';
import { ChatMessage } from '@/lib/api/types';
import { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  console.log('[SERVER] Loading chat page for ID:', id);
  
  try {
    const session = await auth();
    console.log('[SERVER] Session:', session ? 'Found' : 'Not found');

    if (!session || !session.user) {
      redirect('/login');
    }

    const cookieStore = await cookies();
    const cookie = cookieStore.get('access_token');
    
    console.log('[SERVER] Access token:', cookie ? 'Found' : 'Not found');
    
    if (!cookie || !cookie.value) {
      redirect('/login');
    }

    try {
      console.log('[SERVER] Fetching conversation history for ID:', id);
      const { conversation, messages } = await chatApi.getConversationHistory(id, cookie.value);
      console.log('[SERVER] Conversation details:', JSON.stringify(conversation, null, 2));
      console.log('[SERVER] Conversation:', conversation ? 'Found' : 'Not found');
      console.log('[SERVER] Messages count:', messages?.length || 0);
      
      if (!conversation || !messages) {
        return notFound();
      }

      // Extract user ID from JWT token
      const token = cookie.value;
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload.sub;
      
      console.log('User ID from token:', userId);
      
      // Create a plain object for the conversation
      const serializedConversation = {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        visibility: conversation.visibility,
        userId: userId
      };

      console.log('Serialized conversation:', JSON.stringify(serializedConversation, null, 2));

      if (serializedConversation.visibility === 'private' && userId !== serializedConversation.userId) {
        return notFound();
      }

      // Convert messages to plain objects with the correct UIMessage structure
      const serializedMessages: Array<UIMessage> = messages.map((message) => {
        const serialized: UIMessage = {
          id: message.id.toString(),
          role: message.role,
          content: message.content,
          createdAt: new Date(message.created_at),
          parts: [{ type: 'text' as const, text: message.content }],
          experimental_attachments: []
        };
        console.log('Serialized message:', JSON.stringify(serialized, null, 2));
        return serialized;
      });

      console.log('Rendering Chat component with:', {
        id: serializedConversation.id,
        messageCount: serializedMessages.length,
        isReadonly: userId !== serializedConversation.userId
      });

      return (
        <>
          <Chat
            id={serializedConversation.id}
            initialMessages={serializedMessages}
            isReadonly={userId !== serializedConversation.userId}
          />
          <DataStreamHandler id={id} />
        </>
      );
    } catch (error) {
      console.error('Error in conversation fetch:', error);
      if (error instanceof Error) {
        if (error.message === 'Conversation not found') {
          return notFound();
        }
        if (error.message.includes('Authentication failed')) {
          redirect('/login');
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in page component:', error);
    return new Response('An error occurred while loading the chat', { status: 500 });
  }
}
