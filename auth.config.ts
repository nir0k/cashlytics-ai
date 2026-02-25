import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Node.js imports (no DB, no adapter).
 * Used by proxy.ts (Edge runtime) to read JWT sessions.
 * Full auth config with adapter lives in auth.ts (Node.js runtime).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // Providers only needed for sign-in, not session reading
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
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
  },
} satisfies NextAuthConfig;
