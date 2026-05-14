import Link from "next/link";
import { env } from "@/lib/env";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";

export const dynamic = "force-dynamic";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Card>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            Your KOBIL Identity account is signed in, but it does not have the required role
            <code className="mx-1 rounded bg-[var(--color-kobil-surface-muted)] px-1">
              {env().KOBIL_ADMIN_ROLE}
            </code>
            to use the admin console. Ask an administrator to grant the role in the KOBIL realm.
          </CardDescription>
          <div className="mt-2 flex gap-2">
            <Link
              href="/api/admin/auth/logout"
              className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1 text-sm text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)]"
            >
              Sign out admin
            </Link>
            <Link
              href="/profile"
              className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1 text-sm text-[var(--color-kobil-text-muted)] hover:bg-[var(--color-kobil-surface-muted)]"
            >
              Go to user profile
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
