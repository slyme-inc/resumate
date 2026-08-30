import type { ParsedResume } from "@/lib/resume/types";
import { Document, Packer, Paragraph, TextRun } from "docx";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function downloadResumeDocx(resume: ParsedResume, company?: string | null) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: resume.name ?? resume.fileName.replace(/\.[^.]+$/, ""),
          bold: true,
          size: 36,
          font: "Calibri",
        }),
      ],
    }),
  );

  if (resume.headline) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: resume.headline, italics: true, size: 22, font: "Calibri" })],
      }),
    );
  }

  const contacts = [
    resume.email,
    resume.phone,
    resume.location,
    ...resume.links.map((link) => link.url),
  ].filter((value): value is string => Boolean(value));

  if (contacts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: contacts.join("  ·  "), size: 18, font: "Calibri" })],
      }),
    );
  }

  for (const section of resume.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border: { bottom: { color: "1B4F3E", space: 4, style: "single", size: 6 } },
        children: [
          new TextRun({
            text: section.title.toUpperCase(),
            bold: true,
            size: 20,
            font: "Calibri",
            color: "1B4F3E",
          }),
        ],
      }),
    );

    for (const block of section.blocks) {
      if (block.type === "paragraph") {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: block.text, size: 21, font: "Calibri" })],
          }),
        );
      } else if (block.type === "list") {
        for (const item of block.items) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [new TextRun({ text: item, size: 21, font: "Calibri" })],
            }),
          );
        }
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: block.items.join(" · "), size: 21, font: "Calibri" })],
          }),
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const who = slug(resume.name ?? "resume");
  const where = company ? `-${slug(company)}` : "";
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${who}${where}-resume.docx`;
  anchor.click();
  URL.revokeObjectURL(href);
}
