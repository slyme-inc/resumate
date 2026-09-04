import { LinkedText } from "@/app/home/linked-text";
import type { ParsedResume, ResumeBlock, ResumeLink } from "@/lib/resume/types";

function EditableText({
  text,
  editable,
  links,
  onEdit,
  className,
  as: Tag = "p",
}: {
  text: string;
  editable?: boolean;
  links?: ResumeLink[];
  onEdit?: (original: string, next: string) => void;
  className?: string;
  as?: "p" | "h2" | "h3" | "li" | "span";
}) {
  if (!editable || !onEdit) {
    if (links) {
      return (
        <Tag className={className}>
          <LinkedText text={text} links={links} />
        </Tag>
      );
    }
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag
      className={`${className ?? ""} rounded-[6px] outline-none ring-forest/0 focus:bg-card focus:ring-2 focus:ring-forest`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        const next = (event.currentTarget.textContent ?? "").replace(/\u00a0/g, " ");
        if (next !== text) {
          onEdit(text, next);
        }
      }}
    >
      {text}
    </Tag>
  );
}

function BlockView({
  block,
  links,
  editable,
  onEdit,
}: {
  block: ResumeBlock;
  links: ResumeLink[];
  editable?: boolean;
  onEdit?: (original: string, next: string) => void;
}) {
  if (block.type === "list") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-text">
        {block.items.map((item, index) => (
          <EditableText
            key={`${item}-${index}`}
            as="li"
            text={item}
            editable={editable}
            links={links}
            onEdit={onEdit}
          />
        ))}
      </ul>
    );
  }

  if (block.type === "tags") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {block.items.map((item, index) => (
          <EditableText
            key={`${item}-${index}`}
            as="span"
            text={item}
            editable={editable}
            onEdit={onEdit}
            className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium tracking-tight text-forest"
          />
        ))}
      </div>
    );
  }

  return (
    <EditableText
      text={block.text}
      editable={editable}
      links={links}
      onEdit={onEdit}
      className="mt-2 text-[15px] leading-relaxed text-text"
    />
  );
}

function displayHref(link: ResumeLink) {
  if (link.url.startsWith("mailto:")) {
    return link.label || link.url.replace(/^mailto:/, "");
  }
  return link.label || link.url.replace(/^https?:\/\//, "");
}

export function ResumePreview({
  resume,
  editable = false,
  onEdit,
}: {
  resume: ParsedResume | null;
  editable?: boolean;
  onEdit?: (original: string, next: string) => void;
}) {
  if (!resume) {
    return (
      <div className="flex h-full min-h-full items-center justify-center px-8 text-center">
        <p className="max-w-xs text-[15px] leading-relaxed text-muted">
          Upload a Word (.docx) or PDF file on the left. It opens on the right
          as the original document, ready to edit.
        </p>
      </div>
    );
  }

  const contacts = [resume.email, resume.phone, resume.location].filter(
    (value): value is string => Boolean(value),
  );
  const title = resume.name ?? resume.fileName.replace(/\.[^.]+$/, "");

  return (
    <article className="min-h-full w-full px-8 py-10 lg:px-12 lg:py-12">
      <EditableText
        as="h2"
        text={title}
        editable={editable}
        onEdit={onEdit}
        className="font-serif text-4xl font-medium tracking-tight text-ink"
      />
      {resume.headline ? (
        <EditableText
          text={resume.headline}
          editable={editable}
          links={resume.links}
          onEdit={onEdit}
          className="mt-2 text-[15px] text-muted"
        />
      ) : null}
      {contacts.length > 0 || resume.links.length > 0 ? (
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-faint">
          {resume.email ? (
            <a href={`mailto:${resume.email}`} className="text-forest hover:underline">
              {resume.email}
            </a>
          ) : null}
          {resume.phone ? (
            <a href={`tel:${resume.phone.replace(/\s+/g, "")}`} className="hover:underline">
              {resume.phone}
            </a>
          ) : null}
          {resume.location ? <span>{resume.location}</span> : null}
          {resume.links
            .filter((link) => {
              if (!resume.email) {
                return true;
              }
              return link.url !== `mailto:${resume.email}` && link.url !== resume.email;
            })
            .map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-forest underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
            >
              {displayHref(link)}
            </a>
          ))}
        </p>
      ) : null}

      {resume.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <EditableText
            as="h3"
            text={section.title}
            editable={editable}
            onEdit={onEdit}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest"
          />
          <div className="mt-1 border-t border-line pt-2">
            {section.blocks.map((block, index) => (
              <BlockView
                key={`${section.title}-${index}`}
                block={block}
                links={resume.links}
                editable={editable}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
