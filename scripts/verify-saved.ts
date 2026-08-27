/**
 * Exercises the saved-job queries end to end against the real database.
 * Run with: npx tsx scripts/verify-saved.ts
 */
import { config } from "dotenv";
import {
  countSavedJobs,
  fetchJobPool,
  listSavedJobs,
  listSavedKeys,
  saveJob,
  unsaveJob,
} from "@/lib/db/jobs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const USER_ID = process.argv[2];

async function main() {
  if (!USER_ID) {
    console.error("usage: npx tsx scripts/verify-saved.ts <user-id>");
    process.exit(1);
  }

  const [sample] = await fetchJobPool({ limit: 1 });
  if (!sample) {
    throw new Error("no jobs available");
  }
  console.log("using job:", sample.source, sample.id, "-", sample.position);

  const before = await countSavedJobs(USER_ID);
  await saveJob(USER_ID, sample.source, sample.id, 77);
  const afterSave = await countSavedJobs(USER_ID);
  const keys = await listSavedKeys(USER_ID);
  const rows = await listSavedJobs(USER_ID);
  const found = rows.find((row) => row.job.source === sample.source && row.job.id === sample.id);

  console.log("count before:", before, "after save:", afterSave);
  console.log("key present:", keys.has(`${sample.source}:${sample.id}`));
  console.log("join returned job:", found?.job.position, "| stored score:", found?.matchScore);

  // Saving twice must not throw, since the UI can double-submit.
  await saveJob(USER_ID, sample.source, sample.id, 77);
  console.log("idempotent re-save ok, count:", await countSavedJobs(USER_ID));

  await unsaveJob(USER_ID, sample.source, sample.id);
  const afterUnsave = await countSavedJobs(USER_ID);
  console.log("count after unsave:", afterUnsave);

  if (afterUnsave !== before) {
    throw new Error(`cleanup mismatch: expected ${before}, got ${afterUnsave}`);
  }
  console.log("\nOK: save / list / idempotent re-save / unsave all behave");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
