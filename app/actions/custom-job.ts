"use server";

import { upsertCustomJob } from "@/lib/db/jobs";
import { getUserResume } from "@/lib/db/resume";
import {
  CUSTOM_JOB_MAX_CHARS,
  CUSTOM_JOB_MIN_CHARS,
  parsePastedJob,
} from "@/lib/matching/custom-job";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateCustomJobResult =
  | { ok: true; source: string; id: string }
  | { ok: false; error: string };

export async function createCustomJobAction(formData: FormData): Promise<CreateCustomJobResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    return { ok: false, error: "Sign in to analyze a pasted job." };
  }

  const resume = await getUserResume(userId);
  if (!resume) {
    return { ok: false, error: "Upload a résumé before analyzing a role." };
  }

  const raw = formData.get("description");
  const description = typeof raw === "string" ? raw.trim() : "";
  if (description.length < CUSTOM_JOB_MIN_CHARS) {
    return {
      ok: false,
      error: `Paste the full job description (${CUSTOM_JOB_MIN_CHARS}+ characters) so we can score it.`,
    };
  }
  if (description.length > CUSTOM_JOB_MAX_CHARS) {
    return { ok: false, error: "That posting is too long. Paste the role itself, not the whole careers site." };
  }

  const draft = parsePastedJob({ description });
  if (!draft.description) {
    return { ok: false, error: "Paste the job description to continue." };
  }

  try {
    const created = await upsertCustomJob(userId, draft);
    revalidatePath("/jobs");
    revalidatePath("/jobs/paste");
    revalidatePath(`/jobs/${created.source}/${encodeURIComponent(created.id)}`);
    return { ok: true, ...created };
  } catch (error) {
    console.error("Failed to save a pasted job.", error);
    return { ok: false, error: "Could not save that posting. Try again." };
  }
}
