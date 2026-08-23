"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const STORAGE_KEY = "resumate.tour.v1";

const STEPS = [
  {
    title: "Upload your résumé",
    body: "A PDF or DOCX is enough. We read the skills, roles, and dates so every match starts from work you have actually done.",
  },
  {
    title: "See roles ranked to you",
    body: "Open jobs are scored against that profile. Stronger fit rises first — not the listing that shouted the loudest.",
  },
  {
    title: "Know what to strengthen",
    body: "Each role comes with a clear read: what already lands, what is thin, and what a hiring manager will look for.",
  },
  {
    title: "Tailor it in real time",
    body: "Edit the résumé against the job description as you go. The language shifts. The facts stay yours.",
  },
  {
    title: "Apply with a sharper version",
    body: "When the document and the role agree, send it. The aim is a credible application, not a rewritten career.",
  },
] as const;

export function FirstRunTour() {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private mode can block storage; still close the overlay.
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, open]);

  if (!open || !current) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-12">
      <button
        type="button"
        aria-label="Dismiss tutorial"
        className="absolute inset-0 bg-ink/45"
        onClick={dismiss}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-[14px] border border-line bg-card px-8 py-10 shadow-[0_1px_2px_rgba(18,26,23,0.04),0_12px_32px_rgba(18,26,23,0.06)] outline-none"
      >
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          How Resumate works · {String(step + 1).padStart(2, "0")} of{" "}
          {String(STEPS.length).padStart(2, "0")}
        </p>
        <h2
          id={titleId}
          className="mt-3 font-serif text-4xl font-medium tracking-tight text-ink"
        >
          {current.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{current.body}</p>
        <div className="mt-8 flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-150 ${
                index === step ? "w-6 bg-forest" : "w-1.5 bg-line-strong"
              }`}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-semibold tracking-tight text-muted transition-colors duration-150 hover:text-ink"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((currentStep) => currentStep - 1)}
                className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  dismiss();
                  return;
                }
                setStep((currentStep) => currentStep + 1);
              }}
              className="rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright"
            >
              {isLast ? "Start matching" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
