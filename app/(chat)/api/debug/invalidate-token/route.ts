import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Clear all auth cookies
  cookieStore.delete('authjs.session-token');
  cookieStore.delete('authjs.callback-url');
  cookieStore.delete('authjs.csrf-token');
  
  return Response.json({ message: 'Token invalidated' });
}