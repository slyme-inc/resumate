import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

export async function requireUserId() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
