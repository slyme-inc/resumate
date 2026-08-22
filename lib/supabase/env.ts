function requiredEnv(name: "url" | "key") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (name === "url" && !url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (name === "key" && !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return name === "url" ? url! : key!;
}

export function getSupabaseUrl() {
  return requiredEnv("url");
}

export function getSupabaseKey() {
  return requiredEnv("key");
}
