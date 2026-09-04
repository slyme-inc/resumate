"use client";

import { SignOut, User } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function AccountMenu({
  avatarUrl,
  name,
  signOut,
}: {
  avatarUrl: string | null;
  name: string | null;
  signOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const photo = Boolean(avatarUrl) && !imageBroken;
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={name ? `Account menu for ${name}` : "Account menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border transition-colors duration-150 ${
          open ? "border-forest bg-forest-soft" : "border-line-strong bg-card hover:border-forest"
        }`}
      >
        {photo ? (
          // Google avatar URLs are off-origin; skip the optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl ?? ""}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-forest">
            {initials(name)}
          </span>
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-[14px] border border-line bg-card py-1 shadow-[0_12px_32px_rgba(18,26,23,0.08)]"
        >
          <Link
            href="/profile"
            role="menuitem"
            aria-current={profileActive ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold tracking-tight transition-colors duration-150 ${
              profileActive ? "bg-forest-soft text-forest" : "text-ink hover:bg-paper"
            }`}
          >
            <User size={16} weight="bold" />
            Profile
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold tracking-tight text-ink transition-colors duration-150 hover:bg-paper"
            >
              <SignOut size={16} weight="bold" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
