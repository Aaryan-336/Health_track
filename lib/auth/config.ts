import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe slice of the auth config. Kept free of Prisma and bcrypt so it can
 * run in middleware; the credentials provider lives in `lib/auth/index.ts`.
 */
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/sign-in', error: '/sign-in' },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
