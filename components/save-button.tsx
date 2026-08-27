"use client";

import { toggleSavedAction } from "@/app/actions/saved";
import { useState, useTransition } from "react";

export function SaveButton({
  source,
  id,
  matchScore,
  saved,
  variant = "compact",
}: {
  source: string;
  id: string;
  matchScore: number | null;
  saved: boolean;
  variant?: "compact" | "full";
}) {
  const [optimistic, setOptimistic] = useState(saved);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await toggleSavedAction({ source, id, matchScore, saved: optimistic });
      } catch {
        setOptimistic(!next);
      }
    });
  }

  const label = optimistic ? "Saved" : "Save";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={optimistic}
        className={`cursor-pointer rounded-[10px] border px-4 py-3 text-sm font-semibold tracking-tight transition-colors duration-150 disabled:opacity-60 ${
          optimistic
            ? "border-forest bg-forest-soft text-forest"
            : "border-line-strong text-ink hover:bg-card"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={optimistic}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold tracking-tight transition-colors duration-150 disabled:opacity-60 ${
        optimistic
          ? "border-forest bg-forest-soft text-forest"
          : "border-line-strong text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
