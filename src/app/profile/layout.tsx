import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/current-user";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect("/profile");
  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      {/* Back bar — returns to the profile menu (home). paddingTop clears the
          device safe-area so the control isn't hidden under the status bar. */}
      <header
        className="sticky top-0 z-10 border-b border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center px-2 py-2">
          <Link
            href="/"
            aria-label="Zurück zum Profilmenü"
            className="inline-flex min-h-[var(--tap-kobil)] items-center gap-1 rounded-lg px-2 font-medium text-[var(--color-kobil-navy)] transition-colors hover:bg-[var(--color-kobil-surface-muted)]"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Zurück
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
