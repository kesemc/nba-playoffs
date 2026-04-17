import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { isEmailAllowed } from "@/lib/email-allow-list";

// ---- Session typing augmentation ------------------------------------------
// Extend the default session shape so `session.user.id` and `.isAdmin` are typed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isAdmin?: boolean;
  }
}

// ---- NextAuth config -------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    // Route any provider-level error (access denied, OAuth callback failure,
    // etc.) back to our styled sign-in page instead of NextAuth's default
    // unstyled /api/auth/error screen.
    error: "/sign-in",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Safe to enable here: Google verifies the emails it returns, so we
      // can link a fresh Google OAuth account to an existing User row (e.g.
      // a user who originally signed in with the old magic-link provider)
      // without risking spoofed-email account hijacking.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!isEmailAllowed(user.email ?? null)) {
        console.warn(
          `[auth] Sign-in denied for ${user.email} (not in ALLOWED_EMAILS)`,
        );
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      // With database sessions, `user` here is the DB row (typed via augmentation).
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = Boolean((user as { isAdmin?: boolean }).isAdmin);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // First user becomes admin automatically. Subsequent users do not.
      if (!user.id) return;
      const count = await prisma.user.count();
      if (count === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isAdmin: true },
        });
        console.log(`[auth] First user ${user.email} promoted to admin`);
      }
    },
  },
});
