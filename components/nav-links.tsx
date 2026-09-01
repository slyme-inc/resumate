"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
] as const;

const DISCOVERY_LINKS = [
  { href: "/startups", label: "Startup Discovery" },
  { href: "/open-source", label: "Open Source Discovery" },
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

function NavItem({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative rounded-[10px] px-3 py-2 text-sm font-semibold tracking-tight transition-colors duration-150 ${
        active ? "bg-forest-soft text-forest" : "text-muted hover:text-ink"
      }`}
    >
      {label}
      <NavPending />
    </Link>
  );
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {PRIMARY_LINKS.map((link) => (
        <NavItem key={link.href} href={link.href} label={link.label} pathname={pathname} />
      ))}
      <span aria-hidden className="mx-1.5 text-sm font-medium text-line-strong">
        |
      </span>
      {DISCOVERY_LINKS.map((link) => (
        <NavItem key={link.href} href={link.href} label={link.label} pathname={pathname} />
      ))}
    </nav>
  );
}
