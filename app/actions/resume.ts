"use server";

import { saveUserResume } from "@/lib/db/resume";
import { parseResumeFile, type ParsedResume } from "@/lib/resume/parse";
import { createClient } from "@/lib/supabase/server";

export type ParseResumeResult =
  | { ok: true; resume: ParsedResume }
  | { ok: false; error: string };

export async function parseResumeAction(formData: FormData): Promise<ParseResumeResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    return { ok: false, error: "Sign in to upload a résumé." };
  }

  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a PDF or DOCX file." };
  }

  if (file.type && /^(image|text|audio|video)\//.test(file.type)) {
    return { ok: false, error: "Use a PDF or DOCX file." };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const resume = await parseResumeFile(file.name, bytes);
    await saveUserResume(userId, resume);
    return { ok: true, resume };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not read that résumé.";
    return { ok: false, error: message };
  }
}
