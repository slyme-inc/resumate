import type { ParsedResume, ResumeBlock } from "@/lib/resume/types";

function BlockView({ block }: { block: ResumeBlock }) {
  if (block.type === "list") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-text">
        {block.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "tags") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {block.items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return <p className="mt-2 text-[15px] leading-relaxed text-text">{block.text}</p>;
}

export function ResumePreview({ resume }: { resume: ParsedResume | null }) {
  if (!resume) {
    return (
      <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-muted">
          Upload a PDF or DOCX on the left. The parsed résumé will appear here.
        </p>
      </div>
    );
  }

  const contacts = [
    resume.email,
    resume.phone,
    resume.location,
    ...resume.links,
  ].filter((value): value is string => Boolean(value));

  return (
    <article className="min-h-full w-full px-8 py-10 lg:px-12 lg:py-12">
      <h2 className="font-serif text-4xl font-medium tracking-tight text-ink">
        {resume.name ?? resume.fileName.replace(/\.[^.]+$/, "")}
      </h2>
      {resume.headline ? (
        <p className="mt-2 text-[15px] text-muted">{resume.headline}</p>
      ) : null}
      {contacts.length > 0 ? (
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-faint">
          {contacts.map((item) => (
            <span key={item}>{item.replace(/^https?:\/\//, "")}</span>
          ))}
        </p>
      ) : null}

      {resume.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
            {section.title}
          </h3>
          <div className="mt-1 border-t border-line pt-2">
            {section.blocks.map((block, index) => (
              <BlockView key={`${section.title}-${index}`} block={block} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
