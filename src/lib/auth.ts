import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber ?? null,
          isVerified: user.isVerified,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          firstName?: string;
          lastName?: string;
          phoneNumber?: string | null;
          isVerified?: boolean;
        };
        token.id = u.id;
        token.firstName = u.firstName ?? '';
        token.lastName = u.lastName ?? '';
        token.phoneNumber = u.phoneNumber ?? null;
        token.isVerified = u.isVerified ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.firstName = (token.firstName as string) ?? '';
        session.user.lastName = (token.lastName as string) ?? '';
        session.user.phoneNumber = (token.phoneNumber as string | null) ?? null;
        session.user.isVerified = (token.isVerified as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
});
