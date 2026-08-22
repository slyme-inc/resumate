import { signOutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-forest font-serif text-base italic text-paper">
            R
          </span>
          <span className="font-serif text-xl tracking-tight">Resumate</span>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="flex flex-1 items-center justify-center px-6" />
    </div>
  );
}
