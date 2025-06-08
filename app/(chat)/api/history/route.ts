import { auth } from '@/app/(auth)/auth';
import { chatApi } from '@/lib/api/chat';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      console.log('No session found, redirecting to login');
      return new Response('Unauthorized', { 
        status: 401,
        headers: {
          'Location': '/login'
        }
      });
    }

    // Get access token from cookie in request headers
    const cookie = request.headers.get('cookie') || '';
    const accessToken = cookie
      .split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!accessToken) {
      console.log('No access token found in cookies, redirecting to login');
      return new Response('Unauthorized', { 
        status: 401,
        headers: {
          'Location': '/login'
        }
      });
    }

    const response = await chatApi.getConversations({}, accessToken);
    
    console.log('[SERVER] Raw response from API:', JSON.stringify(response, null, 2));
    console.log('[SERVER] Response type:', typeof response);
    
    // Handle both direct array response and wrapped response
    const conversationsArray = Array.isArray(response) ? response : response.conversations;

    if (!conversationsArray) {
      console.error('Invalid response format:', response);
      return new Response('Invalid response format from API', { status: 500 });
    }
    
    console.log('[SERVER] First conversation object:', JSON.stringify(conversationsArray[0], null, 2));
    console.log('[SERVER] First conversation ID type:', typeof conversationsArray[0]?.id);
    console.log('[SERVER] First conversation ID:', conversationsArray[0]?.id);
    
    // Convert the conversation summaries to the format expected by the UI
    const conversations = conversationsArray.map(conv => {
      console.log('[SERVER] Processing conversation:', JSON.stringify(conv, null, 2));
      return {
        id: conv.id,
        title: conv.title, // Convert to string first
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        visibility: conv.visibility || 'private',
        userId: session.user.id
      };
    });

    console.log('[SERVER] Mapped conversations for UI:', JSON.stringify(conversations, null, 2));

    return Response.json(conversations);
  } catch (error) {
    console.error('Error fetching history:', error);
    if (error instanceof Error && error.name === 'AuthError') {
      return new Response('Unauthorized', { 
        status: 401,
        headers: {
          'Location': '/login'
        }
      });
    }
    return new Response('An error occurred while fetching history', { status: 500 });
  }
}
