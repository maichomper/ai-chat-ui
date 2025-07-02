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
    
    // Handle both direct array response and wrapped response
    const conversationsArray = Array.isArray(response) ? response : response.conversations;

    if (!conversationsArray) {
      console.error('Invalid response format:', response);
      return new Response('Invalid response format from API', { status: 500 });
    }
    
    // Convert the conversation summaries to the format expected by the UI
    const conversations = conversationsArray.map(conv => ({
      id: conv.title, // Use title as ID since API doesn't return separate id field
      title: conv.title, 
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      visibility: conv.visibility || 'private',
      userId: session.user.id
    }));

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
