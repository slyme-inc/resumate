"use client";

import { useState } from "react";

const ACCEPT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

function isResumeFile(file: File) {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot) : "";
  return ACCEPT_EXTENSIONS.has(extension);
}

type EmptyResumeStateProps = {
  fileName: string | null;
  error: string | null;
  pending: boolean;
  onFile: (file: File) => void;
  onInvalid: (message: string) => void;
};

export function EmptyResumeState({
  fileName,
  error,
  pending,
  onFile,
  onInvalid,
}: EmptyResumeStateProps) {
  const [isDragging, setIsDragging] = useState(false);

  function takeFile(file: File | undefined) {
    if (!file || pending) {
      return;
    }

    if (!isResumeFile(file)) {
      onInvalid("Use a PDF or DOCX file.");
      return;
    }

    onFile(file);
  }

  return (
    <div className="w-full max-w-md rounded-[14px] border border-line bg-card px-8 py-10 shadow-[0_1px_2px_rgba(18,26,23,0.04),0_12px_32px_rgba(18,26,23,0.06)]">
      <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
        Add your résumé to start matching
      </h1>
      <p className="mt-3 text-[15px] text-muted">
        We read skills, roles, and dates from it. A PDF appears on the right as
        the original pages; a DOCX is shown as a parsed document.
      </p>
      <label
        htmlFor="resume-upload"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) {
            return;
          }
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          takeFile(event.dataTransfer.files[0]);
        }}
        className={`group mt-8 block cursor-pointer rounded-[10px] border border-dashed px-5 py-8 text-center transition-[border-color,background-color] duration-150 ease-out ${
          isDragging
            ? "border-forest bg-forest-soft"
            : "border-line-strong bg-surface"
        } ${pending ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            takeFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="inline-flex rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 ease-out group-hover:bg-forest-bright">
          {pending ? "Analyzing your experience…" : "Upload résumé"}
        </span>
        <span className="mt-3 block text-sm text-muted">
          PDF or DOCX · drop a file here
        </span>
        {fileName ? (
          <span className="mt-3 block font-mono text-sm text-ink">{fileName}</span>
        ) : null}
        {error ? (
          <span className="mt-3 block text-sm text-danger">{error}</span>
        ) : null}
      </label>
    </div>
  );
}
