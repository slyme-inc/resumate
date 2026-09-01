import { AppHeader } from "@/components/app-header";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader nav={false} />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="h-72 w-full max-w-md rounded-[14px] border border-line bg-card" />
      </main>
    </div>
  );
}
