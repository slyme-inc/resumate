import { getUserResume } from "@/lib/db/resume";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getUserId = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
});

export async function requireUserId() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

export async function requireResume() {
  const userId = await requireUserId();
  const resume = await getUserResume(userId);
  if (!resume) {
    redirect("/onboarding");
  }
  return { userId, resume };
}
