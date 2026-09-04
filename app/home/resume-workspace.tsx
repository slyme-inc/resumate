"use client";

import { parseResumeAction, saveResumeDocxAction, saveResumePdfAction } from "@/app/actions/resume";
import { EmptyResumeState } from "@/app/home/empty-resume-state";
import { ResumeDocument } from "@/app/home/resume-document";
import { ResumePreview } from "@/app/home/resume-preview";
import { ResumePreviewSkeleton } from "@/components/skeletons";
import {
  asDocxFileName,
  asPdfFileName,
  asResumeFileName,
  DOCX_CONTENT_TYPE,
  isPdfContentType,
  PDF_CONTENT_TYPE,
} from "@/lib/resume/file-type";
import type { DocxEditorApi } from "@/app/home/docx-editor";
import type { ParsedResume } from "@/lib/resume/types";
import { FilePdf } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export function ResumeWorkspace({
  initialResume,
  initialFileVersion,
  initialContentType,
}: {
  initialResume: ParsedResume | null;
  initialFileVersion: string | null;
  initialContentType: string | null;
}) {
  const editorApi = useRef<DocxEditorApi | null>(null);
  const [resume, setResume] = useState<ParsedResume | null>(initialResume);
  const [fileVersion, setFileVersion] = useState<string | null>(initialFileVersion);
  const [contentType, setContentType] = useState<string | null>(initialContentType);
  const [fileName, setFileName] = useState<string | null>(initialResume?.fileName ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const isPdf = isPdfContentType(contentType);

  async function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    setPending(true);
    setDirty(false);
    editorApi.current = null;

    const formData = new FormData();
    formData.set("resume", file);

    try {
      const result = await parseResumeAction(formData);
      if (!result.ok) {
        setResume(null);
        setFileVersion(null);
        setContentType(null);
        setError(result.error);
        return;
      }
      setResume(result.resume);
      setFileVersion(result.fileVersion);
      setContentType(result.contentType);
    } catch {
      setResume(null);
      setFileVersion(null);
      setContentType(null);
      setError("We could not read that résumé.");
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    const api = editorApi.current;
    if (!api || !fileName) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isPdf) {
        const blob = await api.exportPdf();
        if (!blob) {
          setError("We could not export the document.");
          return;
        }
        const formData = new FormData();
        formData.set(
          "resume",
          new File([blob], asPdfFileName(fileName), { type: PDF_CONTENT_TYPE }),
        );
        const result = await saveResumePdfAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setResume(result.resume);
        setDirty(false);
        return;
      }

      const blob = await api.exportDocx();
      if (!blob) {
        setError("We could not export the document.");
        return;
      }
      const formData = new FormData();
      formData.set(
        "resume",
        new File([blob], asDocxFileName(fileName), { type: DOCX_CONTENT_TYPE }),
      );
      const result = await saveResumeDocxAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResume(result.resume);
      setDirty(false);
    } catch {
      setError("We could not save those edits.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    const api = editorApi.current;
    if (!api || !fileName) {
      return;
    }
    setExportingPdf(true);
    setError(null);
    try {
      const blob = await api.exportPdf({
        download: true,
        fileName: asResumeFileName(fileName, contentType).replace(/\.(docx|pdf)$/i, ""),
      });
      if (!blob) {
        setError("The résumé is still loading.");
      }
    } catch {
      setError("We could not export a PDF of this résumé.");
    } finally {
      setExportingPdf(false);
    }
  }

  const fileSrc = fileVersion ? `/api/resume/file?v=${fileVersion}` : null;

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
            setFileVersion(null);
            setContentType(null);
            setDirty(false);
            setError(message);
          }}
        />
      </section>
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
        {pending ? (
          <ResumePreviewSkeleton />
        ) : resume ? (
          <ResumeDocument
            fileSrc={fileSrc}
            contentType={contentType}
            fileName={asResumeFileName(fileName ?? resume.fileName, contentType)}
            onDirty={() => setDirty(true)}
            onReady={(api) => {
              editorApi.current = api;
            }}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  disabled={exportingPdf || saving}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-line-strong bg-card px-3 py-1.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper disabled:opacity-60"
                >
                  <FilePdf size={16} weight="bold" />
                  {exportingPdf ? "Exporting…" : isPdf ? "Download PDF" : "Export PDF"}
                </button>
                {dirty ? (
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || exportingPdf}
                    className="rounded-[10px] bg-forest px-3 py-1.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                ) : null}
              </>
            }
          />
        ) : (
          <div className="h-full overflow-auto">
            <ResumePreview resume={null} />
          </div>
        )}
      </section>
    </div>
  );
}
