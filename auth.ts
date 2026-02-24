import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, authAccounts, authSessions, authVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { signInSchema } from "@/lib/validations/auth";
import { ZodError } from "zod";

// Extend Session type to include user.id
declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique identifier */
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),
  session: { strategy: "jwt" }, // REQUIRED for Edge compatibility with proxy.ts
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials);

          // TODO: Users table will be created in Phase 2
          // For now, this will return null until users exist
          const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

          if (!user?.password) {
            return null;
          }

          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          if (error instanceof ZodError) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
});
