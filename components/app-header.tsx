import { signOutAction } from "@/app/actions/auth";
import { AccountMenu } from "@/components/account-menu";
import { NavLinks } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";
import logo from "@/public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

async function headerAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const metadata = data.user?.user_metadata ?? {};
  const avatar =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : null;
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    data.user?.email ||
    null;
  return { avatarUrl: avatar, name };
}

function AccountMenuFallback() {
  return (
    <span
      className="block h-10 w-10 rounded-full border border-line bg-card"
      aria-hidden
    />
  );
}

async function AccountMenuSlot() {
  const account = await headerAccount();
  return <AccountMenu avatarUrl={account.avatarUrl} name={account.name} signOut={signOutAction} />;
}

export function AppHeader({ nav = true }: { nav?: boolean }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-paper px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/jobs" aria-label="Resumate home">
          <Image src={logo} alt="Resumate" priority className="h-7 w-auto" />
        </Link>
        {nav ? <NavLinks /> : null}
      </div>
      <Suspense fallback={<AccountMenuFallback />}>
        <AccountMenuSlot />
      </Suspense>
    </header>
  );
}
