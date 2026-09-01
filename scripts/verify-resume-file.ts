import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const SAMPLE_DOCX = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);

async function main() {
  const { createHash } = await import("node:crypto");
  const { getDb } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");
  const { deleteResumeFile, getResumeFile, getResumeFileMeta, saveResumeFile } =
    await import("../lib/db/resume-file");

  console.log("looking up a user…");
  const [user] = await getDb().select({ id: users.id }).from(users).limit(1);
  if (!user) {
    throw new Error("No users in the database to attach a résumé file to.");
  }

  const existing = await getResumeFile(user.id);
  const digest = (input: Uint8Array) =>
    createHash("sha256").update(input).digest("hex");

  console.log("writing", SAMPLE_DOCX.byteLength, "bytes for", user.id);
  await saveResumeFile(user.id, {
    fileName: "round-trip.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: SAMPLE_DOCX,
  });

  const stored = await getResumeFile(user.id);
  if (!stored) {
    throw new Error("Stored file did not come back.");
  }

  const meta = await getResumeFileMeta(user.id);
  const identical =
    digest(SAMPLE_DOCX) === digest(stored.bytes) && meta?.byteSize === SAMPLE_DOCX.byteLength;

  console.log("wrote bytes      ", SAMPLE_DOCX.byteLength, digest(SAMPLE_DOCX));
  console.log("read back bytes  ", stored.bytes.byteLength, digest(stored.bytes));
  console.log("byte size column ", meta?.byteSize);
  console.log("identical        ", identical);

  if (existing) {
    await saveResumeFile(user.id, existing);
  } else {
    await deleteResumeFile(user.id);
  }

  if (!identical) {
    throw new Error("Bytea round-trip did not match.");
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
