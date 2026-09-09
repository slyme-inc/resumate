"use server";

import { requireUserId } from "@/lib/auth/session";
import { saveJob, unsaveJob } from "@/lib/db/jobs";
import { isCustomJobSource, ownsCustomJob } from "@/lib/matching/custom-job";
import { revalidatePath } from "next/cache";

export type ToggleSavedInput = {
  source: string;
  id: string;
  matchScore: number | null;
  saved: boolean;
};

export async function toggleSavedAction({
  source,
  id,
  matchScore,
  saved,
}: ToggleSavedInput) {
  const userId = await requireUserId();

  if (isCustomJobSource(source) && !ownsCustomJob(userId, id)) {
    throw new Error("That pasted role was not found.");
  }

  if (saved) {
    await unsaveJob(userId, source, id);
  } else {
    await saveJob(userId, source, id, matchScore);
  }

  revalidatePath("/jobs");
  revalidatePath("/saved");
  revalidatePath(`/jobs/${source}/${encodeURIComponent(id)}`);

  return { saved: !saved };
}
