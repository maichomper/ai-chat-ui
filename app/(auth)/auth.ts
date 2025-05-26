import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';

// Define our custom User type
interface CustomUser {
  id: string;
  accessToken: string;
}

// Extend the User type to include our custom fields
declare module 'next-auth' {
  interface User extends CustomUser {}
  interface Session {
    user: User;
  }
}

// Helper function to clear the access token cookie
const clearAccessToken = async () => {
  const cookieStore = await cookies();
  cookieStore.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const formData = new URLSearchParams();
          formData.append('username', email);
          formData.append('password', password);

          const url = `${process.env.HARVEST_API_URL}/auth/login`;
          console.log('Making request to:', url);
          console.log('Request body:', formData.toString());

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Login failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              url,
              requestBody: formData.toString(),
            });
            
            // Handle the error detail array properly
            if (Array.isArray(errorData.detail)) {
              const errorMessages = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
              throw new Error(errorMessages);
            }
            throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
          }

          const data = await response.json();
          console.log('Login successful, response:', JSON.stringify(data, null, 2));

          // Store the access token in an HTTP-only cookie
          const cookieStore = await cookies();
          cookieStore.set('access_token', data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
          });

          return {
            id: email,
            accessToken: data.access_token,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  events: {
    async signOut() {
      await clearAccessToken();
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
});
