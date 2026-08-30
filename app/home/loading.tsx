import { AppHeader } from "@/components/app-header";
import { HomeWorkspaceSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <main className="flex min-h-0 flex-1">
        <HomeWorkspaceSkeleton />
      </main>
    </div>
  );
}
