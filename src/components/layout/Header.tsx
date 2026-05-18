"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KobilLogo } from "./KobilLogo";
import { getCopy, Locale } from "@/lib/copy";

export function Header({
  locale = "en",
  username,
}: {
  locale?: Locale;
  username?: string | null;
}) {
  const t = getCopy(locale);
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  const items = [
    { href: "/profile", label: t.nav.overview },
    { href: "/profile/attributes", label: t.nav.attributes },
    { href: "/profile/privacy", label: t.nav.privacy },
    { href: "/profile/data-and-account", label: t.nav.data },
  ];

  function isActive(href: string) {
    if (href === "/profile") return pathname === "/profile";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-kobil-surface)]/70">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:gap-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-[var(--radius-kobil-sm)]"
          onClick={() => setOpen(false)}
        >
          <KobilLogo />
          <span className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-kobil-text-muted)]">
              {t.brand}
            </span>
            <span className="text-sm font-semibold text-[var(--color-kobil-text)]">
              {t.appName}
            </span>
          </span>
        </Link>

        <nav className="hidden gap-1 text-sm md:flex">
          {items.map((i) => {
            const active = isActive(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[var(--radius-kobil-sm)] px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-[var(--color-kobil-primary-tint)] text-[var(--color-kobil-primary)]"
                    : "text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)] hover:text-[var(--color-kobil-primary)]"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {username ? (
            <span
              className="hidden max-w-[14rem] truncate text-[var(--color-kobil-text-muted)] md:inline"
              title={username}
            >
              {username}
            </span>
          ) : null}
          <Link
            href="/api/auth/logout"
            prefetch={false}
            className="hidden rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] px-3 py-1.5 text-[var(--color-kobil-text-muted)] transition-colors hover:border-[var(--color-kobil-primary)] hover:text-[var(--color-kobil-primary)] md:inline-block"
          >
            {t.nav.logout}
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] text-[var(--color-kobil-text)] transition-colors hover:bg-[var(--color-kobil-surface-muted)] md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] md:hidden">
          <ul className="mx-auto flex max-w-3xl flex-col px-2 py-2 text-sm">
            {items.map((i) => {
              const active = isActive(i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block rounded-[var(--radius-kobil-sm)] px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-[var(--color-kobil-primary-tint)] text-[var(--color-kobil-primary)]"
                        : "text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]"
                    }`}
                  >
                    {i.label}
                  </Link>
                </li>
              );
            })}
            {username ? (
              <li className="mt-1 border-t border-[var(--color-kobil-border)] px-3 pt-2 text-xs text-[var(--color-kobil-text-muted)]">
                {username}
              </li>
            ) : null}
            <li>
              <Link
                href="/api/auth/logout"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="block rounded-[var(--radius-kobil-sm)] px-3 py-2.5 text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)]"
              >
                {t.nav.logout}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
