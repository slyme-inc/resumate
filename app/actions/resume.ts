"use server";

import { saveUserResume } from "@/lib/db/resume";
import { deleteResumeFile, saveResumeFile } from "@/lib/db/resume-file";
import { parseResumeFile, type ParsedResume } from "@/lib/resume/parse";
import { createClient } from "@/lib/supabase/server";

export type ParseResumeResult =
  | { ok: true; resume: ParsedResume; pdfVersion: string | null }
  | { ok: false; error: string };

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

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

    if (!isPdf(file.name)) {
      // A DOCX upload replaces any PDF we were still rendering.
      await deleteResumeFile(userId);
      return { ok: true, resume, pdfVersion: null };
    }

    const updatedAt = await saveResumeFile(userId, {
      fileName: file.name,
      contentType: "application/pdf",
      bytes,
    });

    return { ok: true, resume, pdfVersion: String(updatedAt.getTime()) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not read that résumé.";
    return { ok: false, error: message };
  }
}
