export const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isDocxContentType(contentType: string | null | undefined) {
  if (!contentType) {
    return false;
  }
  const value = contentType.toLowerCase();
  return value.includes("wordprocessingml") || value.includes("officedocument.word") || value.endsWith("docx");
}

export function isDocxFileName(fileName: string) {
  return fileName.toLowerCase().endsWith(".docx");
}

export function asDocxFileName(fileName: string) {
  return isDocxFileName(fileName) ? fileName : `${fileName.replace(/\.[^.]+$/, "") || "resume"}.docx`;
}

export function asPdfFileName(fileName: string) {
  const base = fileName.replace(/\.(docx|pdf)$/i, "") || "resume";
  return `${base}.pdf`;
}
