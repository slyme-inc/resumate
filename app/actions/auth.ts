"use server";

import { clearAuthSession } from "@/lib/db/auth";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=auth");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  await clearAuthSession(data?.claims);
  await supabase.auth.signOut();
  redirect("/login");
}
