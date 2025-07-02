import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl, method } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      
      // Always allow auth API endpoints
      if (pathname.startsWith('/api/auth')) {
        return true;
      }
      
      // Handle login/register pages
      const isOnAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
      
      // Allow POST requests to auth pages (for form submissions)
      if (isOnAuthPage && method === 'POST') {
        return true;
      }

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && isOnAuthPage) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      // Allow unauthenticated access to auth pages
      if (isOnAuthPage) {
        return true;
      }
      
      // Define protected routes that require authentication
      const isProtectedRoute = 
        pathname === '/' || // Home page
        /^\/[a-zA-Z0-9-_]+$/.test(pathname) || // Chat ID routes like /:id
        (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')); // API routes except auth
      
      // Protect routes that need authentication
      if (isProtectedRoute && !isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl as unknown as URL));
      }

      // Allow access by default
      return true;
    },
  },
} satisfies NextAuthConfig;
