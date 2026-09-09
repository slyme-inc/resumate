"use client";

import { createCustomJobAction } from "@/app/actions/custom-job";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PasteJobForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="rounded-[14px] border border-line bg-card p-5"
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await createCustomJobAction(formData);
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(
          `/jobs/${encodeURIComponent(result.source)}/${encodeURIComponent(result.id)}`,
        );
        router.refresh();
      }}
    >
      <label className="block">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Job description
        </span>
        <textarea
          name="description"
          required
          minLength={80}
          rows={16}
          placeholder="Paste the full posting — title, company, and requirements can stay in the text."
          className="mt-1.5 min-h-72 w-full resize-y rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm tracking-tight text-ink outline-none placeholder:text-faint focus:border-forest"
        />
      </label>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
        >
          {pending ? "Scoring this role…" : "Analyze this role"}
        </button>
      </div>
    </form>
  );
}
