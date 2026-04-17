import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";

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

// ---- Helpers ---------------------------------------------------------------
function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function allowList(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter((s) => s.length > 0),
  );
}

function isDevResendKey(key: string | undefined): boolean {
  if (!key) return true;
  if (key.length === 0) return true;
  if (key.startsWith("re_dev_")) return true;
  return false;
}

// ---- NextAuth config -------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
      // Dev fallback: if no real Resend key is configured, log the magic-link
      // URL to stdout so you can click it without setting up email.
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (isDevResendKey(process.env.AUTH_RESEND_KEY)) {
          console.log(
            [
              "",
              "==========================================================",
              "  [auth] No Resend key configured — magic link below:",
              `  to:   ${identifier}`,
              `  link: ${url}`,
              "==========================================================",
              "",
            ].join("\n"),
          );
          return;
        }

        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: `Sign in to NBA Playoffs Pool`,
            text: `Sign in to NBA Playoffs Pool at ${host}\n\n${url}\n\nIf you did not request this email you can safely ignore it.`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: auto; padding: 24px;">
                <h2 style="margin: 0 0 16px;">Sign in to NBA Playoffs Pool</h2>
                <p>Click the button below to sign in on <b>${host}</b>. This link will expire in 24 hours.</p>
                <p style="margin: 24px 0;">
                  <a href="${url}" style="background:#111; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none; display:inline-block;">Sign in</a>
                </p>
                <p style="color:#666; font-size:12px;">If you did not request this email you can safely ignore it.</p>
              </div>`,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "<unreadable>");
          throw new Error(`Resend send failed (${res.status}): ${body}`);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ? normalizeEmail(user.email) : null;
      if (!email) return false;

      const list = allowList();
      if (list.size > 0 && !list.has(email)) {
        console.warn(`[auth] Sign-in denied for ${email} (not in ALLOWED_EMAILS)`);
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
