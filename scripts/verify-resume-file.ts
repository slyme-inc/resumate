import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const SAMPLE_PDF = new TextEncoder().encode(
  "%PDF-1.1\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n",
);

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

  console.log("writing", SAMPLE_PDF.byteLength, "bytes for", user.id);
  await saveResumeFile(user.id, {
    fileName: "round-trip.pdf",
    contentType: "application/pdf",
    bytes: SAMPLE_PDF,
  });

  const stored = await getResumeFile(user.id);
  if (!stored) {
    throw new Error("Stored file did not come back.");
  }

  const meta = await getResumeFileMeta(user.id);
  const identical =
    digest(SAMPLE_PDF) === digest(stored.bytes) && meta?.byteSize === SAMPLE_PDF.byteLength;

  console.log("wrote bytes      ", SAMPLE_PDF.byteLength, digest(SAMPLE_PDF));
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
