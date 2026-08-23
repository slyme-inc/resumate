import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asParsedResume } from "@/lib/resume/stored";
import type { ParsedResume } from "@/lib/resume/types";
import { eq } from "drizzle-orm";

export async function getUserResume(userId: string) {
  const [row] = await getDb()
    .select({ resume: users.resume })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return asParsedResume(row?.resume ?? null);
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
