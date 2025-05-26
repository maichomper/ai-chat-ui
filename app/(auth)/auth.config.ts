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
      
      // Explicitly allow auth API endpoints
      if (pathname.startsWith('/api/auth')) {
        return true;
      }
      
      // Handle login/register pages
      const isOnRegister = pathname.startsWith('/register');
      const isOnLogin = pathname.startsWith('/login');
      
      // Allow POST requests to login/register
      if ((isOnLogin || isOnRegister) && method === 'POST') {
        return true;
      }

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin) {
        return true; // Always allow access to register and login pages
      }
      
      // Define protected routes more specifically
      // Check if it's a protected route that needs authentication
      const isProtectedRoute = 
        pathname === '/' || // Home page
        /^\/[a-zA-Z0-9-_]+$/.test(pathname) || // Chat ID routes like /:id
        pathname.startsWith('/api/') && !pathname.startsWith('/api/auth'); // API routes except auth
      
      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return Response.redirect(new URL('/login', nextUrl as unknown as URL));
      }

      // Default: allow access
      return true;
    },
  },
} satisfies NextAuthConfig;
