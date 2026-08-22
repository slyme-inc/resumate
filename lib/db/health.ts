import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function checkDbHealth() {
  await db.execute(sql`select 1`);
}
