"use client";

import { loadOpportunityInsightAction } from "@/app/actions/insight";
import { OpportunityIntel } from "@/components/opportunity-intel";
import { ResumeTailor } from "@/components/resume-tailor";
import type { OpportunityInsight } from "@/lib/ai/types";
import type { ParsedResume } from "@/lib/resume/types";
import { useEffect, useState, type ReactNode } from "react";

export function JobWorkspace({
  source,
  id,
  company,
  resume,
  focusSkills,
  fileSrc,
  contentType,
  header,
  children,
}: {
  source: string;
  id: string;
  company: string;
  resume: ParsedResume;
  focusSkills: string[];
  fileSrc: string | null;
  contentType: string | null;
  header: ReactNode;
  children: ReactNode;
}) {
  const [insight, setInsight] = useState<OpportunityInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadOpportunityInsightAction(source, id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInsight(result.insight);
    });
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:w-1/2">
        {header}
        <div className="mt-8">
          <OpportunityIntel insight={insight} loading={loading} error={error} />
        </div>
        <div className="mt-6">{children}</div>
      </div>
      <aside className="flex min-h-[55vh] min-w-0 flex-1 flex-col border-t border-line bg-card lg:min-h-0 lg:w-1/2 lg:border-t-0 lg:border-l">
        <ResumeTailor
          resume={resume}
          insight={insight}
          loading={loading}
          company={company}
          focusSkills={focusSkills}
          fileSrc={fileSrc}
          contentType={contentType}
        />
      </aside>
    </div>
  );
}
