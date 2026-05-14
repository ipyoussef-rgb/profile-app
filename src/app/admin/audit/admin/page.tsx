import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { adminAudit } from "@/lib/admin-audit";
import { requireAdminOrRedirect } from "@/lib/admin-current-user";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SP = { admin_subject?: string; action?: string; page?: string };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const admin = await requireAdminOrRedirect("/admin/audit/admin");

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const where: { admin_subject?: string; action?: string } = {};
  if (sp.admin_subject && /^[0-9a-fA-F-]{36}$/.test(sp.admin_subject)) where.admin_subject = sp.admin_subject;
  if (sp.action) where.action = sp.action;

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  await adminAudit({
    admin_subject: admin.sub,
    admin_username: admin.preferred_username ?? null,
    action: "admin_audit_viewed",
    resource: "admin_audit_logs",
    metadata: { page, total, where },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (where.admin_subject) params.set("admin_subject", where.admin_subject);
    if (where.action) params.set("action", where.action);
    params.set("page", String(p));
    return `/admin/audit/admin?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Admin activity audit</CardTitle>
        <CardDescription>
          Every admin action that touches data — including the act of viewing this page — is
          recorded in <code>admin_audit_logs</code>.
        </CardDescription>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs text-[var(--color-kobil-text-muted)]">
              <tr>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">When</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Admin</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Action</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Resource</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Target user</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-kobil-border)]/50">
                  <td className="py-2 pr-3 text-xs">{r.created_at.toISOString()}</td>
                  <td className="py-2 pr-3 text-xs">{r.admin_username ?? r.admin_subject.slice(0, 8) + "…"}</td>
                  <td className="py-2 pr-3">{r.action}</td>
                  <td className="py-2 pr-3 text-xs">{r.resource ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.target_user_id ? r.target_user_id.slice(0, 8) + "…" : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-[var(--color-kobil-text-muted)]">
                    No admin events yet.
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
