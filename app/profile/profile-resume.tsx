"use client";

import { parseResumeAction } from "@/app/actions/resume";
import { ResumeDocument } from "@/app/home/resume-document";
import { AppHeader } from "@/components/app-header";
import { ResumePreviewSkeleton } from "@/components/skeletons";
import { asDocxFileName } from "@/lib/resume/file-type";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

export function ProfileResumePanel({
  fileName,
  fileVersion,
  contentType,
  intro,
  children,
}: {
  fileName: string;
  fileVersion: string | null;
  contentType: string | null;
  intro: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(fileVersion);
  const [type, setType] = useState(contentType);
  const [name, setName] = useState(fileName);

  async function handleFile(file: File) {
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
      setName(result.resume.fileName);
      setVersion(result.fileVersion);
      setType(result.contentType);
      setOpen(true);
      router.refresh();
    } catch {
      setError("We could not read that résumé.");
    } finally {
      setPending(false);
    }
  }

  const fileSrc = version ? `/api/resume/file?v=${version}` : null;

  const body = (
    <>
      {intro}
      <section className="mt-8 rounded-[14px] border border-line bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-forest">
              Résumé
            </h2>
            <p className="mt-2 truncate font-mono text-sm text-ink">{name}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper"
            >
              {open ? "Hide résumé" : "View résumé"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
            >
              {pending ? "Replacing…" : "Replace"}
            </button>
            <input
              ref={inputRef}
              id="profile-resume-replace"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) {
                  return;
                }
                if (!file.name.toLowerCase().endsWith(".docx")) {
                  setError("Use a Word (.docx) file.");
                  return;
                }
                void handleFile(file);
              }}
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </section>
      {children}
    </>
  );

  const documentPane = pending ? (
    <ResumePreviewSkeleton />
  ) : (
    <ResumeDocument
      fileSrc={fileSrc}
      contentType={type}
      fileName={asDocxFileName(name)}
    />
  );

  if (!open) {
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{body}</main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10 lg:w-1/2">
          <div className="mx-auto w-full max-w-3xl">{body}</div>
        </main>
        <aside className="fixed inset-0 z-30 flex min-w-0 flex-col bg-card lg:static lg:z-auto lg:min-h-0 lg:w-1/2 lg:border-l lg:border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
            <p className="truncate font-mono text-sm text-ink">{name}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[10px] border border-line-strong px-3 py-1.5 text-sm font-semibold tracking-tight text-ink"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1">{documentPane}</div>
        </aside>
      </div>
    </div>
  );
}
