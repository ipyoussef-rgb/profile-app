"use client";

import Link from "next/link";
import { useState } from "react";
import { KobilLogo } from "./KobilLogo";

const linkClass =
  "text-[var(--color-kobil-text-muted)] hover:text-[var(--color-kobil-primary)]";

export function AdminHeader({ username }: { username?: string | null }) {
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/audit/users", label: "User audit" },
    { href: "/admin/audit/admin", label: "Admin audit" },
    { href: "/admin/catalogs", label: "Catalogs" },
  ];

  return (
    <header className="border-b border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-3">
          <KobilLogo />
          <span className="text-sm font-semibold text-[var(--color-kobil-text)]">
            Profile Admin
          </span>
        </Link>

        <nav className="hidden gap-4 text-sm md:flex">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={linkClass}>
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {username ? (
            <span
              className="hidden text-[var(--color-kobil-text-muted)] md:inline"
              title={username}
            >
              {username}
            </span>
          ) : null}
          <Link
            href="/api/admin/auth/logout" prefetch={false}
            className="hidden rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1 text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)] md:inline-block"
          >
            Sign out
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] p-2 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-kobil-border)] md:hidden">
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-2 text-sm">
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  className="block py-2 text-[var(--color-kobil-text)]"
                  onClick={() => setOpen(false)}
                >
                  {i.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-[var(--color-kobil-border)]">
              <Link
                href="/api/admin/auth/logout" prefetch={false}
                className="block py-2 text-[var(--color-kobil-text-muted)]"
              >
                Sign out
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
