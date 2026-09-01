"use client";

import { parseResumeAction } from "@/app/actions/resume";
import { EmptyResumeState } from "@/app/home/empty-resume-state";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingUpload() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.set("resume", file);

    try {
      const result = await parseResumeAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/jobs");
      router.refresh();
    } catch {
      setError("We could not read that résumé.");
    } finally {
      setPending(false);
    }
  }

  return (
    <EmptyResumeState
      fileName={fileName}
      error={error}
      pending={pending}
      onFile={handleFile}
      onInvalid={(message) => {
        setFileName(null);
        setError(message);
      }}
    />
  );
}
