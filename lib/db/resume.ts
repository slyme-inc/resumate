import { getDb } from "@/lib/db";
import { getUserResumeAndProfile } from "@/lib/db/profile";
import { users } from "@/lib/db/schema";
import type { ParsedResume } from "@/lib/resume/types";
import { eq } from "drizzle-orm";

export async function getUserResume(userId: string) {
  const { resume } = await getUserResumeAndProfile(userId);
  return resume;
}

export async function saveUserResume(userId: string, resume: ParsedResume) {
  await getDb()
    .update(users)
    .set({
      resume,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
