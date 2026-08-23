import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

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

function throwIfError(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

export async function upsertUserAndSession(
  supabase: ServerSupabase,
  input: {
    user: AuthUser;
    claims?: AuthClaims | null;
    expiresAtUnix?: number;
  },
) {
  const email = input.user.email ?? asString(input.claims?.email);
  if (!email) {
    throw new Error("Cannot persist user without an email");
  }

  const metadata = input.user.user_metadata ?? {};
  const now = new Date().toISOString();

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: input.user.id,
      email,
      name: metadata.full_name ?? metadata.name ?? null,
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  throwIfError(userError, "Failed to persist user");

  const sessionId = asString(input.claims?.session_id);
  if (!sessionId) {
    return;
  }

  const { error: sessionError } = await supabase.from("sessions").upsert(
    {
      id: sessionId,
      user_id: input.user.id,
      expires_at: expiresAtFromClaims(input.claims ?? undefined, input.expiresAtUnix).toISOString(),
    },
    { onConflict: "id" },
  );
  throwIfError(sessionError, "Failed to persist session");
}

export async function clearAuthSession(
  supabase: ServerSupabase,
  claims?: AuthClaims | null,
) {
  const sessionId = asString(claims?.session_id);
  if (sessionId) {
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    throwIfError(error, "Failed to clear session");
    return;
  }

  const userId = asString(claims?.sub);
  if (userId) {
    const { error } = await supabase.from("sessions").delete().eq("user_id", userId);
    throwIfError(error, "Failed to clear sessions");
  }
}
