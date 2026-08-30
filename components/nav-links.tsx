"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/saved", label: "Saved" },
  { href: "/home", label: "Résumé" },
  { href: "/profile", label: "Profile" },
] as const;

function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-forest transition-opacity ${
        pending ? "animate-pulse opacity-70" : "opacity-0"
      }`}
    />
  );
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-[10px] px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150 ${
              active ? "bg-forest-soft text-forest" : "text-muted hover:text-ink"
            }`}
          >
            {link.label}
            <NavPending />
          </Link>
        );
      })}
    </nav>
  );
}
