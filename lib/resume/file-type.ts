export const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const PDF_CONTENT_TYPE = "application/pdf";

export function isDocxContentType(contentType: string | null | undefined) {
  if (!contentType) {
    return false;
  }
  const value = contentType.toLowerCase();
  return value.includes("wordprocessingml") || value.includes("officedocument.word") || value.endsWith("docx");
}

export function isPdfContentType(contentType: string | null | undefined) {
  if (!contentType) {
    return false;
  }
  return contentType.toLowerCase().includes("pdf");
}

export function isDocxFileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".docx");
}

export function isPdfFileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

export function isResumeFileName(fileName: string) {
  return isDocxFileName(fileName) || isPdfFileName(fileName);
}

export function asDocxFileName(fileName: string) {
  return isDocxFileName(fileName) ? fileName : `${fileName.replace(/\.[^.]+$/, "") || "resume"}.docx`;
}

export function asPdfFileName(fileName: string) {
  const base = fileName.replace(/\.(docx|pdf)$/i, "") || "resume";
  return `${base}.pdf`;
}

export function asResumeFileName(fileName: string, contentType?: string | null) {
  if (isPdfContentType(contentType) || isPdfFileName(fileName)) {
    return asPdfFileName(fileName);
  }
  return asDocxFileName(fileName);
}
