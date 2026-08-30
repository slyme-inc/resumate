import { getDb } from "@/lib/db";
import { resumeFile } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export type StoredResumeFile = {
  fileName: string;
  contentType: string;
  byteSize: number;
  bytes: Uint8Array;
  updatedAt: Date;
};

export type StoredResumeFileMeta = Omit<StoredResumeFile, "bytes">;

function bytesFromHex(hex: string) {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export async function getResumeFile(userId: string): Promise<StoredResumeFile | null> {
  // Read as hex so the transaction pooler cannot hand back an empty binary
  // payload. postgres.js + Supavisor have done that with raw bytea.
  const [row] = await getDb()
    .select({
      fileName: resumeFile.fileName,
      contentType: resumeFile.contentType,
      byteSize: resumeFile.byteSize,
      hex: sql<string>`encode(${resumeFile.bytes}, 'hex')`,
      updatedAt: resumeFile.updatedAt,
    })
    .from(resumeFile)
    .where(eq(resumeFile.userId, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const bytes = bytesFromHex(row.hex);
  if (bytes.byteLength === 0) {
    return null;
  }

  return {
    fileName: row.fileName,
    contentType: row.contentType,
    byteSize: row.byteSize,
    bytes,
    updatedAt: row.updatedAt,
  };
}

/** The bytes run to megabytes, so pages that only need to know a file exists skip them. */
export async function getResumeFileMeta(
  userId: string,
): Promise<StoredResumeFileMeta | null> {
  const [row] = await getDb()
    .select({
      fileName: resumeFile.fileName,
      contentType: resumeFile.contentType,
      byteSize: resumeFile.byteSize,
      updatedAt: resumeFile.updatedAt,
    })
    .from(resumeFile)
    .where(eq(resumeFile.userId, userId))
    .limit(1);

  if (!row || row.byteSize <= 0) {
    return null;
  }

  return row;
}

export async function saveResumeFile(
  userId: string,
  file: { fileName: string; contentType: string; bytes: Uint8Array },
) {
  if (file.bytes.byteLength === 0) {
    throw new Error("That file is empty.");
  }

  const updatedAt = new Date();
  const values = {
    fileName: file.fileName,
    contentType: file.contentType,
    byteSize: file.bytes.byteLength,
    bytes: file.bytes,
    updatedAt,
  };

  await getDb()
    .insert(resumeFile)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: resumeFile.userId, set: values });

  return updatedAt;
}

export async function deleteResumeFile(userId: string) {
  await getDb().delete(resumeFile).where(eq(resumeFile.userId, userId));
}
