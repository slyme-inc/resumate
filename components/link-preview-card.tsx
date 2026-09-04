"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

const CARD_CLASS =
  "group relative block min-w-0 aspect-[3/2] overflow-hidden rounded-[14px] border border-line bg-card transition-colors duration-150 hover:border-line-strong";

export function LinkPreviewSkeleton() {
  return (
    <div
      className="aspect-[3/2] animate-pulse rounded-[14px] border border-line bg-card"
      aria-hidden="true"
    />
  );
}

export function PreviewFrame({
  href,
  title,
  tag,
  fresh,
  badge,
  image,
  logo,
  external = true,
}: {
  href?: ComponentProps<typeof Link>["href"] | null;
  title: string;
  tag: string;
  fresh?: boolean;
  badge?: string;
  image?: string | null;
  logo?: string | null;
  external?: boolean;
}) {
  const [imageBroken, setImageBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const photo = Boolean(image) && !imageBroken;
  const mark = Boolean(logo) && !logoBroken && !photo;
  const label = tag.trim().toLowerCase();

  const body = (
    <>
      {photo ? (
        // OG images come from arbitrary sites; skip the optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image ?? ""}
          alt=""
          onError={() => setImageBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : null}
      {photo ? (
        <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/10" />
      ) : null}
      {mark ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="mb-12 flex h-20 w-20 items-center justify-center rounded-[18px] border border-line bg-paper p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo ?? ""}
              alt=""
              onError={() => setLogoBroken(true)}
              className="max-h-full max-w-full object-contain"
            />
          </span>
        </span>
      ) : null}
      {fresh ? (
        <span className="absolute left-3 top-3 rounded-[6px] border border-gold/85 bg-card/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
          New
        </span>
      ) : null}
      {badge ? (
        photo ? (
          <span className="absolute right-3 top-3 rounded-[6px] border border-gold/85 bg-card/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
            {badge}
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-[6px] bg-forest-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-forest">
            {badge}
          </span>
        )
      ) : null}
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span
          className={`block font-serif text-[17px] font-medium leading-snug tracking-tight line-clamp-2 ${
            photo ? "text-card" : "text-ink"
          }`}
        >
          {title}
        </span>
        {label ? (
          photo ? (
            <span className="mt-2.5 inline-flex rounded-[6px] border border-gold/85 px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.14em] text-gold">
              {label}
            </span>
          ) : (
            <span className="mt-2.5 inline-flex rounded-full bg-forest-soft px-2.5 py-1 text-xs font-medium lowercase tracking-tight text-forest">
              {label}
            </span>
          )
        ) : null}
      </span>
    </>
  );

  if (!href) {
    return <article className={CARD_CLASS}>{body}</article>;
  }

  if (external && typeof href === "string") {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={CARD_CLASS}>
        {body}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={CARD_CLASS}>
      {body}
    </Link>
  );
}
