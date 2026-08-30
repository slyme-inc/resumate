"use server";

import { extractProfileWithGemini } from "@/lib/ai/profile";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getUserResumeAndProfile, saveUserProfile } from "@/lib/db/profile";
import { ROLE_LABELS, type RoleFamily } from "@/lib/matching/taxonomy";
import { heuristicStoredProfile, toStoredProfile } from "@/lib/profile/hydrate";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

export async function saveProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to edit your profile." };
  }

  const { resume, profile } = await getUserResumeAndProfile(userId);
  if (!resume) {
    return { ok: false, error: "Upload a résumé before editing your profile." };
  }

  const roles = formData
    .getAll("roles")
    .filter((value): value is string => typeof value === "string" && value in ROLE_LABELS);

  const yearsRaw = String(formData.get("years") ?? "").trim();
  const years = yearsRaw ? Number.parseInt(yearsRaw, 10) : null;

  await saveUserProfile(
    userId,
    toStoredProfile(resume, {
      source: "user",
      name: profile?.name ?? resume.name,
      headline: String(formData.get("headline") ?? ""),
      location: String(formData.get("location") ?? ""),
      seniority: String(formData.get("seniority") ?? ""),
      yearsOfExperience: years !== null && Number.isFinite(years) ? years : null,
      roles: roles as RoleFamily[],
      titles: profile?.titles ?? [],
      primarySkills: String(formData.get("primarySkills") ?? "").split(/[\n,]+/),
      secondarySkills: String(formData.get("secondarySkills") ?? "").split(/[\n,]+/),
      strengths: String(formData.get("strengths") ?? "").split("\n"),
      facts: profile?.facts ?? [],
      inferences: profile?.inferences ?? [],
      industryInterests: String(formData.get("industryInterests") ?? "").split(/[\n,]+/),
      startupSuitability: String(formData.get("startupSuitability") ?? ""),
    }),
  );

  revalidatePath("/profile");
  revalidatePath("/jobs");
  revalidatePath("/home");
  return { ok: true };
}

export async function reanalyzeProfileAction(): Promise<ProfileActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to re-analyze your profile." };
  }

  const { resume } = await getUserResumeAndProfile(userId);
  if (!resume) {
    return { ok: false, error: "Upload a résumé first." };
  }

  if (!isGeminiConfigured()) {
    await saveUserProfile(userId, heuristicStoredProfile(resume));
    revalidatePath("/profile");
    return { ok: false, error: "Gemini is not configured, so the heuristic profile was kept." };
  }

  try {
    await saveUserProfile(userId, await extractProfileWithGemini(resume));
    revalidatePath("/profile");
    revalidatePath("/jobs");
    revalidatePath("/home");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gemini could not analyze that résumé.",
    };
  }
}
