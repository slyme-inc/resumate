"use client";

import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import type { ReactNode } from "react";

const BASE = "#e3ddd1";
const HIGHLIGHT = "#fbf8f2";

export function AppSkeletonTheme({ children }: { children: ReactNode }) {
  return (
    <SkeletonTheme baseColor={BASE} highlightColor={HIGHLIGHT} borderRadius={8} duration={1.4}>
      {children}
    </SkeletonTheme>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-[14px] border border-line bg-card p-6">{children}</section>;
}

export function OpportunityIntelSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Reading your résumé against this posting</span>
      <Card>
        <Skeleton width={168} height={11} />
        <div className="mt-4">
          <Skeleton count={3} height={14} className="mb-2" />
        </div>
        <div className="mt-5">
          <Skeleton width={132} height={14} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Skeleton width={76} height={26} borderRadius={999} />
            <Skeleton width={92} height={26} borderRadius={999} />
            <Skeleton width={64} height={26} borderRadius={999} />
            <Skeleton width={84} height={26} borderRadius={999} />
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton width={196} height={11} />
        <div className="mt-4 space-y-4">
          <div>
            <Skeleton width={56} height={14} />
            <div className="mt-2">
              <Skeleton count={2} height={14} className="mb-2" />
            </div>
          </div>
          <div>
            <Skeleton width={88} height={14} />
            <div className="mt-2">
              <Skeleton count={2} height={14} className="mb-2" />
            </div>
          </div>
          <div className="rounded-[10px] border border-line p-3">
            <Skeleton height={12} width="70%" />
            <div className="mt-2">
              <Skeleton height={14} />
              <Skeleton height={14} width="85%" />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton width={140} height={11} />
        <div className="mt-4">
          <Skeleton count={4} height={14} className="mb-2" />
        </div>
      </Card>
    </div>
  );
}

export function ResumePreviewSkeleton() {
  return (
    <div className="flex h-full min-h-full flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Analyzing your résumé</span>
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
        <Skeleton width={160} height={12} />
        <Skeleton width={88} height={12} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-6">
        <div className="mx-auto max-w-[640px] rounded-[4px] border border-line bg-paper p-8 shadow-[0_1px_2px_rgba(18,26,23,0.06),0_12px_32px_rgba(18,26,23,0.10)]">
          <Skeleton width="42%" height={28} />
          <div className="mt-3">
            <Skeleton width="28%" height={12} />
          </div>
          <div className="mt-8">
            <Skeleton width={96} height={11} />
            <div className="mt-3">
              <Skeleton count={4} height={13} className="mb-2" />
            </div>
          </div>
          <div className="mt-8">
            <Skeleton width={120} height={11} />
            <div className="mt-3">
              <Skeleton count={6} height={13} className="mb-2" />
            </div>
          </div>
          <div className="mt-8">
            <Skeleton width={80} height={11} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Skeleton width={72} height={24} borderRadius={999} />
              <Skeleton width={88} height={24} borderRadius={999} />
              <Skeleton width={64} height={24} borderRadius={999} />
              <Skeleton width={96} height={24} borderRadius={999} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Re-analyzing your profile</span>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton height={42} />
        <Skeleton height={42} />
        <Skeleton height={42} />
        <Skeleton height={42} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton width={140} height={30} borderRadius={999} />
        <Skeleton width={156} height={30} borderRadius={999} />
        <Skeleton width={128} height={30} borderRadius={999} />
        <Skeleton width={118} height={30} borderRadius={999} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton height={148} />
        <Skeleton height={148} />
      </div>
      <Skeleton height={88} />
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-line bg-card p-5">
      <div className="flex items-start gap-4">
        <Skeleton width={56} height={56} borderRadius={14} />
        <div className="min-w-0 flex-1">
          <Skeleton width="62%" height={22} />
          <div className="mt-2">
            <Skeleton width="28%" height={14} />
          </div>
          <div className="mt-3">
            <Skeleton count={2} height={14} className="mb-2" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Skeleton width={72} height={24} borderRadius={999} />
            <Skeleton width={88} height={24} borderRadius={999} />
            <Skeleton width={64} height={24} borderRadius={999} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobsFeedSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading matches</span>
      <Skeleton width={280} height={36} />
      <div className="mt-3 max-w-2xl">
        <Skeleton count={2} height={14} className="mb-2" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <Skeleton width={48} height={28} />
          <div className="mt-2">
            <Skeleton width={96} height={10} />
          </div>
        </Card>
        <Card>
          <Skeleton width={48} height={28} />
          <div className="mt-2">
            <Skeleton width={96} height={10} />
          </div>
        </Card>
        <Card>
          <Skeleton width={48} height={28} />
          <div className="mt-2">
            <Skeleton width={72} height={10} />
          </div>
        </Card>
      </div>
      <div className="mt-4 rounded-[14px] border border-line bg-card p-5">
        <Skeleton height={42} />
      </div>
      <div className="mt-6 space-y-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}

export function SavedFeedSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading saved roles</span>
      <Skeleton width={120} height={36} />
      <div className="mt-3">
        <Skeleton width="40%" height={14} />
      </div>
      <div className="mt-8 space-y-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}

export function HomeWorkspaceSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading résumé workspace</span>
      <section className="flex items-center justify-center border-b border-line px-6 py-12 lg:border-b-0 lg:border-r">
        <div className="w-full max-w-sm">
          <Skeleton height={160} borderRadius={14} />
          <div className="mt-4">
            <Skeleton height={14} />
            <Skeleton height={14} width="70%" className="mt-2" />
          </div>
        </div>
      </section>
      <section className="min-h-0 overflow-hidden bg-card">
        <ResumePreviewSkeleton />
      </section>
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading role</span>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:w-1/2">
        <Skeleton width={140} height={12} />
        <div className="mt-5 flex items-start gap-5">
          <Skeleton width={56} height={56} borderRadius={14} />
          <div className="min-w-0 flex-1">
            <Skeleton width="70%" height={32} />
            <div className="mt-3">
              <Skeleton width="30%" height={16} />
            </div>
          </div>
        </div>
        <div className="mt-8">
          <OpportunityIntelSkeleton />
        </div>
      </div>
      <aside className="flex min-h-[55vh] flex-1 flex-col border-t border-line bg-card lg:min-h-0 lg:w-1/2 lg:border-t-0 lg:border-l">
        <ResumePreviewSkeleton />
      </aside>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading profile</span>
      <Skeleton width={180} height={12} />
      <div className="mt-2">
        <Skeleton width={240} height={36} />
      </div>
      <div className="mt-3 max-w-xl">
        <Skeleton count={2} height={14} className="mb-2" />
      </div>
      <div className="mt-8 rounded-[14px] border border-line bg-card p-6">
        <ProfileFormSkeleton />
      </div>
    </div>
  );
}

