"use client";

import type { OpportunityInsight } from "@/lib/ai/types";
import { downloadResumeDocx } from "@/lib/resume/download";
import {
  applyAcceptedEdits,
  attachSuggestions,
  flattenResume,
  mergeSuggestions,
  skillReorderSuggestions,
  unmatchedRewrites,
} from "@/lib/resume/lines";
import type { ParsedResume } from "@/lib/resume/types";
import { Check, DownloadSimple, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

type Decision = "accepted" | "rejected" | "pending";

function DiffHunk({
  current,
  suggested,
  reason,
  bullet,
  onAccept,
  onReject,
}: {
  current: string;
  suggested: string;
  reason?: string;
  bullet?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="group relative mt-2 overflow-hidden rounded-[10px] border border-line">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept edit"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-forest text-paper transition-colors hover:bg-forest-bright"
        >
          <Check size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onReject}
          aria-label="Reject edit"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-danger text-paper transition-opacity hover:opacity-90"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
      <p className="bg-[#f8e8e6] px-3 py-2 pr-20 text-[14px] leading-relaxed text-danger line-through decoration-danger/50">
        {bullet ? `• ${current}` : current}
      </p>
      <p className="bg-[#e6f0ea] px-3 py-2 pr-20 text-[14px] leading-relaxed text-forest">
        {bullet ? `• ${suggested}` : suggested}
      </p>
      {reason ? (
        <p className="border-t border-line bg-card px-3 py-1.5 text-[12px] leading-relaxed text-muted">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

export function ResumeTailor({
  resume,
  insight,
  loading,
  company,
  focusSkills = [],
}: {
  resume: ParsedResume;
  insight: OpportunityInsight | null;
  loading: boolean;
  company: string;
  focusSkills?: string[];
}) {
  const lines = useMemo(() => flattenResume(resume), [resume]);
  const suggested = useMemo(() => {
    const fromModel = attachSuggestions(lines, insight?.resumeFit.improve ?? []);
    return mergeSuggestions(fromModel, skillReorderSuggestions(lines, focusSkills));
  }, [lines, insight, focusSkills]);
  const leftover = useMemo(
    () => unmatchedRewrites(insight?.resumeFit.improve ?? [], suggested),
    [insight, suggested],
  );
  const [status, setStatus] = useState<Record<string, Decision>>({});

  const pendingIds = [
    ...suggested.keys(),
    ...leftover.map((_, index) => `extra-${index}`),
  ];
  const pendingCount = pendingIds.filter((id) => (status[id] ?? "pending") === "pending").length;
  const acceptedCount = pendingIds.filter((id) => status[id] === "accepted").length;

  function decide(id: string, decision: Decision) {
    setStatus((current) => ({ ...current, [id]: decision }));
  }

  async function onDownload() {
    const tailored = applyAcceptedEdits(resume, lines, suggested, {
      ...Object.fromEntries([...suggested.keys()].map((id) => [id, status[id] ?? "pending"])),
    });
    const extras = leftover
      .map((rewrite, index) =>
        status[`extra-${index}`] === "accepted" ? rewrite.suggested : null,
      )
      .filter((value): value is string => Boolean(value));
    if (extras.length > 0 && tailored.sections.length > 0) {
      const last = tailored.sections[tailored.sections.length - 1];
      last.blocks.push({ type: "list", items: extras });
    }
    await downloadResumeDocx(tailored, company);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-forest">
            Résumé for this role
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-ink">
            {loading
              ? "Finding suggested edits…"
              : pendingCount > 0
                ? `${pendingCount} suggested edit${pendingCount === 1 ? "" : "s"}`
                : suggested.size > 0
                  ? "Suggestions reviewed"
                  : "No line edits for this posting"}
          </p>
        </div>
        {acceptedCount > 0 ? (
          <button
            type="button"
            onClick={() => void onDownload()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-forest px-3 py-2 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
          >
            <DownloadSimple size={16} weight="bold" />
            Download
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <article>
            {lines.map((line) => {
              const rewrite = suggested.get(line.id);
              const decision = status[line.id] ?? "pending";

              if (line.display === "title") {
                return (
                  <div key={line.id}>
                    <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">
                      {line.text}
                    </h2>
                    {resume.email || resume.phone || resume.location ? (
                      <p className="mt-2 font-mono text-[11px] text-faint">
                        {[resume.email, resume.phone, resume.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (line.display === "heading") {
                return (
                  <h3
                    key={line.id}
                    className="mt-7 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest"
                  >
                    {line.text}
                    <span className="mt-1 block border-t border-line" />
                  </h3>
                );
              }

              if (rewrite && decision === "pending") {
                return (
                  <DiffHunk
                    key={line.id}
                    current={rewrite.current || line.text}
                    suggested={rewrite.suggested}
                    reason={rewrite.reason}
                    bullet={line.display === "bullet"}
                    onAccept={() => decide(line.id, "accepted")}
                    onReject={() => decide(line.id, "rejected")}
                  />
                );
              }

              const text =
                rewrite && decision === "accepted" ? rewrite.suggested : line.text;

              return (
                <p
                  key={line.id}
                  className={`mt-2 text-[14px] leading-relaxed ${
                    rewrite && decision === "accepted"
                      ? "rounded-[8px] bg-[#e6f0ea] px-3 py-2 text-forest"
                      : "text-text"
                  }`}
                >
                  {line.display === "bullet" ? `• ${text}` : text}
                </p>
              );
            })}
            {leftover.length > 0 ? (
              <div className="mt-8">
                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-forest">
                  Additional suggestions
                  <span className="mt-1 block border-t border-line" />
                </h3>
                {leftover.map((rewrite, index) => {
                  const id = `extra-${index}`;
                  const decision = status[id] ?? "pending";
                  if (decision === "rejected") return null;
                  if (decision === "accepted") {
                    return (
                      <p
                        key={id}
                        className="mt-2 rounded-[8px] bg-[#e6f0ea] px-3 py-2 text-[14px] leading-relaxed text-forest"
                      >
                        • {rewrite.suggested}
                      </p>
                    );
                  }
                  return (
                    <DiffHunk
                      key={id}
                      current={rewrite.current}
                      suggested={rewrite.suggested}
                      reason={rewrite.reason}
                      bullet
                      onAccept={() => decide(id, "accepted")}
                      onReject={() => decide(id, "rejected")}
                    />
                  );
                })}
              </div>
            ) : null}
          </article>
      </div>
    </div>
  );
}
