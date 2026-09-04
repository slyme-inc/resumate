"use client";

import type { DocxEditorApi } from "@/app/home/docx-editor";
import { ResumePreviewSkeleton } from "@/components/skeletons";
import { isDocxContentType, isPdfContentType } from "@/lib/resume/file-type";
import type { ParsedResume } from "@/lib/resume/types";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const DocxEditor = dynamic(
  () => import("@/app/home/docx-editor").then((mod) => mod.DocxEditor),
  { ssr: false, loading: () => <ResumePreviewSkeleton /> },
);

const PdfEditor = dynamic(
  () => import("@/app/home/pdf-editor").then((mod) => mod.PdfEditor),
  { ssr: false, loading: () => <ResumePreviewSkeleton /> },
);

export function ResumeDocument({
  fileSrc,
  contentType,
  fileName,
  actions,
  onDirty,
  onReady,
  documentMode,
}: {
  resume?: ParsedResume;
  fileSrc: string | null;
  contentType: string | null;
  fileName: string;
  actions?: ReactNode;
  onDirty?: () => void;
  onReady?: (api: DocxEditorApi) => void;
  documentMode?: "editing" | "suggesting" | "viewing";
}) {
  if (fileSrc && isPdfContentType(contentType)) {
    return (
      <PdfEditor
        src={fileSrc}
        fileName={fileName}
        actions={actions}
        onDirty={onDirty}
        onReady={onReady}
        documentMode={documentMode}
      />
    );
  }

  if (fileSrc && isDocxContentType(contentType)) {
    return (
      <DocxEditor
        src={fileSrc}
        fileName={fileName}
        actions={actions}
        onDirty={onDirty}
        onReady={onReady}
        documentMode={documentMode}
      />
    );
  }

  return (
    <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
      <p className="max-w-sm text-[15px] leading-relaxed text-muted">
        Upload a Word (.docx) or PDF file to edit it here.
      </p>
    </div>
  );
}
