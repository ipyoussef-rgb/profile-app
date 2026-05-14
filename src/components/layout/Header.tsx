import Link from "next/link";
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
  return (
    <header className="border-b border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/profile" className="flex items-center gap-3">
          <KobilLogo />
          <span className="text-sm font-semibold text-[var(--color-kobil-text)]">{t.appName}</span>
        </Link>
        <nav className="hidden gap-4 text-sm sm:flex">
          <Link href="/profile" className="text-[var(--color-kobil-text-muted)] hover:text-[var(--color-kobil-primary)]">
            {t.nav.overview}
          </Link>
          <Link
            href="/profile/privacy"
            className="text-[var(--color-kobil-text-muted)] hover:text-[var(--color-kobil-primary)]"
          >
            {t.nav.privacy}
          </Link>
          <Link
            href="/profile/data-and-account"
            className="text-[var(--color-kobil-text-muted)] hover:text-[var(--color-kobil-primary)]"
          >
            {t.nav.data}
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {username ? (
            <span className="hidden text-[var(--color-kobil-text-muted)] sm:inline" title={username}>
              {username}
            </span>
          ) : null}
          <Link
            href="/api/auth/logout"
            className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1 text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)]"
          >
            {t.nav.logout}
          </Link>
        </div>
      </div>
    </header>
  );
}
