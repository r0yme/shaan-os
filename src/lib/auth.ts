import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterSession } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { rateLimit, clearRateLimit } from "@/lib/rate-limit";

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const IP_ATTEMPT_LIMIT = 10;
const IP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const FAIL_LIMIT_PER_EMAIL_IP = 2;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

const credentialSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    Google,
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }
        const { email, password } = parsed.data;
        const ip = getClientIp(request);

        const ipAllowed = rateLimit({
          key: `login:ip:${ip}`,
          limit: IP_ATTEMPT_LIMIT,
          windowMs: IP_ATTEMPT_WINDOW_MS,
        });
        if (!ipAllowed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.deletedAt) {
          return null;
        }
        if (user.status === "SUSPENDED") {
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          const emailIpKey = `login:email-ip:${email}:${ip}`;
          const failAllowed = rateLimit({
            key: emailIpKey,
            limit: FAIL_LIMIT_PER_EMAIL_IP,
            windowMs: FAIL_WINDOW_MS,
          });
          if (!failAllowed.success) {
            return null;
          }
          const failed = user.failedLoginCount + 1;
          const shouldLock = failed >= MAX_FAILED_LOGINS;
          await prisma.user
            .update({
              where: { id: user.id },
              data: {
                failedLoginCount: failed,
                ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
              },
            })
            .catch((err) => logger.error({ err }, "Failed to record login attempt"));
          await recordAudit({
            actorId: user.id,
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
            summary: shouldLock ? "Account locked after repeated failures" : "Invalid credentials",
          });
          return null;
        }

        clearRateLimit(`login:email-ip:${email}:${ip}`);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { tokenVersion: true },
        });
        token.tokenVersion = dbUser?.tokenVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      (session as { tokenVersion?: number }).tokenVersion = token.tokenVersion as number | undefined;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
        })
        .catch((err) => logger.error({ err }, "Failed to update user after sign in"));
      await recordAudit({
        actorId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      });
    },
    async signOut(
      data: { session: void | AdapterSession | null | undefined } | { token: JWT | null },
    ) {
      const token = "token" in data ? data.token : null;
      if (token?.sub) {
        await recordAudit({
          actorId: token.sub as string,
          action: "LOGOUT",
          entity: "User",
          entityId: token.sub as string,
        });
      }
    },
  },
});
