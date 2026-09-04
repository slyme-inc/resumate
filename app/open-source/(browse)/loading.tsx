import { AppHeader } from "@/components/app-header";
import { OssSessionSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <OssSessionSkeleton />
      </main>
    </div>
  );
}
