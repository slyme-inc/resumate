"use client";

import { parseResumeAction } from "@/app/actions/resume";
import { EmptyResumeState } from "@/app/home/empty-resume-state";
import { PdfPreview } from "@/app/home/pdf-preview";
import { ResumePreview } from "@/app/home/resume-preview";
import type { ParsedResume } from "@/lib/resume/types";
import { useState } from "react";

export function ResumeWorkspace({
  initialResume,
  initialPdfVersion,
}: {
  initialResume: ParsedResume | null;
  initialPdfVersion: string | null;
}) {
  const [resume, setResume] = useState<ParsedResume | null>(initialResume);
  const [pdfVersion, setPdfVersion] = useState<string | null>(initialPdfVersion);
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
        setPdfVersion(null);
        setError(result.error);
        return;
      }
      setResume(result.resume);
      setPdfVersion(result.pdfVersion);
    } catch {
      setResume(null);
      setPdfVersion(null);
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
            setPdfVersion(null);
            setError(message);
          }}
        />
      </section>
      <section className="min-h-0 overflow-hidden bg-card">
        {resume && pdfVersion ? (
          // The version in the URL makes a re-upload refetch rather than
          // re-render the PDF the browser already has.
          <PdfPreview
            src={`/api/resume/file?v=${pdfVersion}`}
            fileName={resume.fileName}
            links={resume.links}
            email={resume.email}
          />
        ) : (
          <div className="h-full overflow-auto">
            <ResumePreview resume={resume} />
          </div>
        )}
      </section>
    </div>
  );
}
