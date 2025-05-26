import { auth } from '@/app/(auth)/auth';
import { chatApi } from '@/lib/api/chat';
import { StatusCodes } from 'http-status-codes';

export const maxDuration = 60;

async function getAccessTokenFromCookie(request: Request): Promise<string> {
  const cookie = request.headers.get('cookie') || '';
  const accessToken = cookie
    .split(';')
    .find(c => c.trim().startsWith('access_token='))
    ?.split('=')[1];

  if (!accessToken) {
    throw new Error('No access token found');
  }

  return accessToken;
}

async function validateSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

async function validateUserMessage(messages: Array<{ content: string; role: string }>) {
  const userMessage = messages[messages.length - 1];
  if (!userMessage || userMessage.role !== 'user') {
    throw new Error('No user message found');
  }
  return userMessage;
}

async function createTextStream(messages: Array<{ content: string; role: string }>, id: string, accessToken: string) {
  return chatApi.sendMessage({ messages, id }, accessToken);
}

export async function POST(request: Request) {
  try {
    const { id, messages }: {
      id: string;
      messages: Array<{ content: string; role: string }>;
    } = await request.json();

    console.log('Received request with id:', id);
    console.log('Messages count:', messages.length);

    // Validate auth and request
    await validateSession();
    await validateUserMessage(messages);
    const accessToken = await getAccessTokenFromCookie(request);
    console.log('Found access token of length:', accessToken.length);

    // Create and return stream
    const stream = await createTextStream(messages, id, accessToken);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Error) {
      switch (error.message) {
        case 'Unauthorized':
        case 'No access token found':
        case 'Authentication failed':
          // For all auth errors, return a 401 without a Location header
          // The client will handle the redirect
          return new Response('Unauthorized', { status: StatusCodes.UNAUTHORIZED });
        case 'No user message found':
          return new Response('No user message found', { status: StatusCodes.BAD_REQUEST });
      }
    }
    
    return new Response('An error occurred while processing your request!', {
      status: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Not Found', { status: StatusCodes.NOT_FOUND });
    }

    await validateSession();
    const accessToken = await getAccessTokenFromCookie(request);
    await chatApi.deleteConversation(id, accessToken);
    
    return new Response('Chat deleted', { status: StatusCodes.OK });

  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'Unauthorized':
        case 'No access token found':
          return new Response(error.message, { status: StatusCodes.UNAUTHORIZED });
        case 'Authentication failed':
          return new Response('Authentication failed', { 
            status: StatusCodes.UNAUTHORIZED,
            headers: {
              'Location': '/login'
            }
          });
      }
    }

    return new Response('An error occurred while processing your request!', {
      status: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}
