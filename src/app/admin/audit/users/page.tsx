import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { adminAudit } from "@/lib/admin-audit";
import { requireAdminOrRedirect } from "@/lib/admin-current-user";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SP = { user_id?: string; action?: string; page?: string };

export default async function UsersAuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const admin = await requireAdminOrRedirect("/admin/audit/users");

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const filters: { user_id?: string; action?: string } = {};
  if (sp.user_id && /^[0-9a-fA-F-]{36}$/.test(sp.user_id)) filters.user_id = sp.user_id;
  if (sp.action) filters.action = sp.action;

  const where = {
    ...(filters.user_id ? { user_id: filters.user_id } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.profileAuditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.profileAuditLog.count({ where }),
  ]);

  // Audit the fact that an admin viewed user audit logs.
  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    target_user_id: filters.user_id ?? null,
    action: "user_audit_viewed",
    resource: "profile_audit_logs",
    metadata: { page, filters, total },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.user_id) params.set("user_id", filters.user_id);
    if (filters.action) params.set("action", filters.action);
    params.set("page", String(p));
    return `/admin/audit/users?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>User activity audit</CardTitle>
        <CardDescription>
          Read-only view of <code>profile_audit_logs</code>. Filter by user_id or action. Each
          view is itself recorded in the admin audit log.
        </CardDescription>
        <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-[var(--color-kobil-text-muted)]">
            user_id (UUID)
            <input
              name="user_id"
              defaultValue={filters.user_id ?? ""}
              className="mt-1 w-72 rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-2 py-1 text-sm"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>
          <label className="flex flex-col text-xs text-[var(--color-kobil-text-muted)]">
            action
            <select
              name="action"
              defaultValue={filters.action ?? ""}
              className="mt-1 rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-2 py-1 text-sm"
            >
              <option value="">(any)</option>
              <option value="profile_read">profile_read</option>
              <option value="profile_update">profile_update</option>
              <option value="profile_export">profile_export</option>
              <option value="profile_deletion_requested">profile_deletion_requested</option>
              <option value="consent_updated">consent_updated</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-[var(--radius-kobil)] bg-[var(--color-kobil-primary)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Filter
          </button>
          {(filters.user_id || filters.action) && (
            <Link
              href="/admin/audit/users"
              className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1.5 text-sm text-[var(--color-kobil-text-muted)]"
            >
              Reset
            </Link>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs text-[var(--color-kobil-text-muted)]">
              <tr>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">When</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">User</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Action</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Fields</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-kobil-border)]/50">
                  <td className="py-2 pr-3 text-xs">{r.created_at.toISOString()}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="py-2 pr-3">{r.action}</td>
                  <td className="py-2 pr-3 text-xs">
                    {r.changed_fields.length > 0 ? r.changed_fields.join(", ") : "—"}
                  </td>
                  <td className="py-2 pr-3 text-xs">{r.decision}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-[var(--color-kobil-text-muted)]">
                    No matching audit events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-kobil-text-muted)]">
          <div>
            {total} events · page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-2 py-1 ${
                page <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              ← Prev
            </Link>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-2 py-1 ${
                page >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
