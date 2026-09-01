"use server";

import { extractProfileWithGemini } from "@/lib/ai/profile";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { saveUserProfile } from "@/lib/db/profile";
import { saveUserResume } from "@/lib/db/resume";
import { saveResumeFile } from "@/lib/db/resume-file";
import { heuristicStoredProfile } from "@/lib/profile/hydrate";
import { feedCacheTag } from "@/lib/matching/feed";
import { asDocxFileName, DOCX_CONTENT_TYPE, isDocxFileName } from "@/lib/resume/file-type";
import { parseResumeFile, type ParsedResume } from "@/lib/resume/parse";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath, updateTag } from "next/cache";

export type ParseResumeResult =
  | {
      ok: true;
      resume: ParsedResume;
      fileVersion: string;
      contentType: string;
    }
  | { ok: false; error: string };

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

async function storeDocx(
  userId: string,
  file: File,
  options: { extractProfile: boolean },
): Promise<ParseResumeResult> {
  if (!isDocxFileName(file.name)) {
    return { ok: false, error: "Use a Word (.docx) file." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const resume = await parseResumeFile(file.name, bytes);
  await saveUserResume(userId, resume);

  if (options.extractProfile) {
    let profile = heuristicStoredProfile(resume);
    if (isGeminiConfigured()) {
      try {
        profile = await extractProfileWithGemini(resume);
      } catch (error) {
        console.error("Gemini profile extraction failed; keeping heuristic profile.", error);
      }
    }
    await saveUserProfile(userId, profile);
  }

  const updatedAt = await saveResumeFile(userId, {
    fileName: asDocxFileName(file.name),
    contentType: DOCX_CONTENT_TYPE,
    bytes,
  });

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  revalidatePath("/jobs");
  updateTag(feedCacheTag(userId));

  return {
    ok: true,
    resume,
    fileVersion: String(updatedAt.getTime()),
    contentType: DOCX_CONTENT_TYPE,
  };
}

export async function parseResumeAction(formData: FormData): Promise<ParseResumeResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to upload a résumé." };
  }

  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a Word (.docx) file." };
  }

  if (file.type && /^(image|text|audio|video|application\/pdf)\//.test(file.type)) {
    return { ok: false, error: "Use a Word (.docx) file." };
  }

  try {
    return await storeDocx(userId, file, { extractProfile: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not read that résumé.";
    return { ok: false, error: message };
  }
}

export async function saveResumeDocxAction(formData: FormData): Promise<ParseResumeResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to save résumé edits." };
  }

  const file = formData.get("resume");
  if (!(file instanceof File)) {
    return { ok: false, error: "Nothing to save." };
  }

  try {
    return await storeDocx(userId, file, { extractProfile: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not save those edits.";
    return { ok: false, error: message };
  }
}
