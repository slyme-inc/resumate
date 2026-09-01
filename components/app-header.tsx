import { signOutAction } from "@/app/actions/auth";
import { NavLinks } from "@/components/nav-links";
import logo from "@/public/logo.png";
import Image from "next/image";
import Link from "next/link";

export function AppHeader({ nav = true }: { nav?: boolean }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-paper px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/jobs" aria-label="Resumate home">
          <Image src={logo} alt="Resumate" priority className="h-7 w-auto" />
        </Link>
        {nav ? <NavLinks /> : null}
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="cursor-pointer rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-card"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
