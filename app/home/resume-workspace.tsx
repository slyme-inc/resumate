"use client";

import { parseResumeAction } from "@/app/actions/resume";
import { EmptyResumeState } from "@/app/home/empty-resume-state";
import { ResumePreview } from "@/app/home/resume-preview";
import type { ParsedResume } from "@/lib/resume/types";
import { useState } from "react";

export function ResumeWorkspace({
  initialResume,
}: {
  initialResume: ParsedResume | null;
}) {
  const [resume, setResume] = useState<ParsedResume | null>(initialResume);
  const [fileName, setFileName] = useState<string | null>(initialResume?.fileName ?? null);
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
        setResume(null);
        setError(result.error);
        return;
      }
      setResume(result.resume);
    } catch {
      setResume(null);
      setError("We could not read that résumé.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-2">
      <section className="flex items-center justify-center border-b border-line px-6 py-12 lg:border-b-0 lg:border-r">
        <EmptyResumeState
          fileName={fileName}
          error={error}
          pending={pending}
          onFile={handleFile}
          onInvalid={(message) => {
            setFileName(null);
            setResume(null);
            setError(message);
          }}
        />
      </section>
      <section className="min-h-0 overflow-auto bg-card">
        <ResumePreview resume={resume} />
      </section>
    </div>
  );
}
