"use client";

import { reanalyzeProfileAction, saveProfileAction } from "@/app/actions/profile";
import { ProfileFormSkeleton } from "@/components/skeletons";
import {
  ROLE_LABELS,
  SENIORITY_LABELS,
  type RoleFamily,
  type SeniorityLevel,
} from "@/lib/matching/taxonomy";
import type { StoredProfile } from "@/lib/profile/stored";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).filter(([id]) => id !== "other") as Array<
  [RoleFamily, string]
>;

export function ProfileForm({
  profile,
  geminiReady,
}: {
  profile: StoredProfile;
  geminiReady: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const primary = profile.skills
    .filter((skill) => skill.prominence === "primary")
    .map((skill) => skill.label)
    .join("\n");
  const secondary = profile.skills
    .filter((skill) => skill.prominence === "secondary")
    .map((skill) => skill.label)
    .join("\n");

  if (analyzing) {
    return <ProfileFormSkeleton />;
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-6"
        action={async (formData) => {
          setPending(true);
          setSaved(false);
          setError(null);
          const result = await saveProfileAction(formData);
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
          router.refresh();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Headline
            </span>
            <input
              name="headline"
              defaultValue={profile.headline ?? ""}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Location
            </span>
            <input
              name="location"
              defaultValue={profile.location ?? ""}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Seniority
            </span>
            <select
              name="seniority"
              defaultValue={profile.seniority}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            >
              {(Object.entries(SENIORITY_LABELS) as Array<[SeniorityLevel, string]>).map(
                ([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Years of experience
            </span>
            <input
              name="years"
              type="number"
              min={0}
              max={50}
              defaultValue={profile.yearsOfExperience ?? ""}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
        </div>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Preferred roles
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(([id, label]) => (
              <label
                key={id}
                className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink"
              >
                <input
                  type="checkbox"
                  name="roles"
                  value={id}
                  defaultChecked={profile.roles.includes(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Primary skills
            </span>
            <textarea
              name="primarySkills"
              defaultValue={primary}
              rows={6}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Secondary skills
            </span>
            <textarea
              name="secondarySkills"
              defaultValue={secondary}
              rows={6}
              className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Strengths
          </span>
          <textarea
            name="strengths"
            defaultValue={profile.strengths.join("\n")}
            rows={4}
            className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Industry interests
          </span>
          <input
            name="industryInterests"
            defaultValue={profile.industryInterests.join(", ")}
            className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Startup suitability
          </span>
          <textarea
            name="startupSuitability"
            defaultValue={profile.startupSuitability ?? ""}
            rows={2}
            className="mt-1 w-full rounded-[10px] border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-forest px-4 py-2.5 text-sm font-semibold tracking-tight text-paper transition-colors duration-150 hover:bg-forest-bright disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
          {saved ? <p className="text-sm text-forest">Saved. Matching will use this.</p> : null}
        </div>
      </form>

      <form
        action={async () => {
          setAnalyzing(true);
          setError(null);
          const result = await reanalyzeProfileAction();
          setAnalyzing(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
      >
        <button
          type="submit"
          disabled={analyzing || !geminiReady}
          className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-card disabled:opacity-60"
        >
          {analyzing ? "Re-analyzing…" : "Re-analyze with Gemini"}
        </button>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
