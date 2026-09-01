import { upsertUserAndSession } from "@/lib/db/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/jobs";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const [{ data: userData }, { data: claimsData }, { data: sessionData }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getClaims(),
          supabase.auth.getSession(),
        ]);

      if (userData.user) {
        try {
          await upsertUserAndSession(supabase, {
            user: userData.user,
            claims: claimsData?.claims,
            expiresAtUnix: sessionData.session?.expires_at,
          });
        } catch (persistError) {
          console.error("Failed to persist user/session", persistError);
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
