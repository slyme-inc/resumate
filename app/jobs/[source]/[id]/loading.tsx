import { AppHeader } from "@/components/app-header";
import { JobDetailSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <JobDetailSkeleton />
    </div>
  );
}
