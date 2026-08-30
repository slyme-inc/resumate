import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isStoredProfile, type StoredProfile } from "@/lib/profile/stored";
import { asParsedResume } from "@/lib/resume/stored";
import type { ParsedResume } from "@/lib/resume/types";
import { eq } from "drizzle-orm";

export async function getUserResumeAndProfile(userId: string) {
  const [row] = await getDb()
    .select({ resume: users.resume, profile: users.profile })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    resume: asParsedResume(row?.resume ?? null),
    profile: isStoredProfile(row?.profile) ? row.profile : null,
  };
}

export async function saveUserProfile(userId: string, profile: StoredProfile) {
  await getDb()
    .update(users)
    .set({
      profile,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getUserResume(userId: string): Promise<ParsedResume | null> {
  const { resume } = await getUserResumeAndProfile(userId);
  return resume;
}
