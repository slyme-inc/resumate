import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

type AuthClaims = {
  sub?: unknown;
  email?: unknown;
  session_id?: unknown;
  exp?: unknown;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  } | null;
};

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function expiresAtFromClaims(claims: AuthClaims | undefined, fallbackUnix?: number) {
  const exp = typeof claims?.exp === "number" ? claims.exp : fallbackUnix;
  if (typeof exp === "number" && Number.isFinite(exp)) {
    return new Date(exp * 1000);
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export async function upsertUserAndSession(input: {
  user: AuthUser;
  claims?: AuthClaims | null;
  expiresAtUnix?: number;
}) {
  const email = input.user.email ?? asString(input.claims?.email);
  if (!email) {
    throw new Error("Cannot persist user without an email");
  }

  const metadata = input.user.user_metadata ?? {};
  const now = new Date();

  await db
    .insert(users)
    .values({
      id: input.user.id,
      email,
      name: metadata.full_name ?? metadata.name ?? null,
      avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        name: metadata.full_name ?? metadata.name ?? null,
        avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
        updatedAt: now,
      },
    });

  const sessionId = asString(input.claims?.session_id);
  if (!sessionId) {
    return;
  }

  await db
    .insert(sessions)
    .values({
      id: sessionId,
      userId: input.user.id,
      expiresAt: expiresAtFromClaims(input.claims ?? undefined, input.expiresAtUnix),
    })
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        userId: input.user.id,
        expiresAt: expiresAtFromClaims(input.claims ?? undefined, input.expiresAtUnix),
      },
    });
}

export async function deleteSessionById(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteSessionsForUser(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function clearAuthSession(claims?: AuthClaims | null) {
  const sessionId = asString(claims?.session_id);
  if (sessionId) {
    await deleteSessionById(sessionId);
    return;
  }

  const userId = asString(claims?.sub);
  if (userId) {
    await deleteSessionsForUser(userId);
  }
}
