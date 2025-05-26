import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

// Restore middleware with proper configuration
export const config = {
  matcher: [
    // Protected routes
    '/',
    '/:id', 
    
    // API routes excluding auth endpoints
    '/api/((?!auth).+)*',
    
    // Auth pages
    '/login',
    '/register',
  ],
};
