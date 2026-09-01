import { getDb } from "@/lib/db";
import { jobRoleCard } from "@/lib/db/schema";
import { isRoleCard, type RoleCard } from "@/lib/matching/role-card";
import { and, eq } from "drizzle-orm";

export async function getStoredRoleCard(source: string, id: string): Promise<RoleCard | null> {
  const [row] = await getDb()
    .select()
    .from(jobRoleCard)
    .where(and(eq(jobRoleCard.source, source), eq(jobRoleCard.id, id)))
    .limit(1);

  return row && isRoleCard(row.card) ? row.card : null;
}

export async function saveRoleCard(source: string, id: string, card: RoleCard) {
  await getDb()
    .insert(jobRoleCard)
    .values({
      source,
      id,
      card,
      extractedBy: card.source,
    })
    .onConflictDoUpdate({
      target: [jobRoleCard.source, jobRoleCard.id],
      set: { card, extractedBy: card.source, updatedAt: new Date() },
    });
}
