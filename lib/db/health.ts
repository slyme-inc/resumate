import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function checkDbHealth() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  const response = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}`);
  }
}
