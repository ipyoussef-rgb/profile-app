import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

async function stats() {
  const [profiles, deletionRequests, consentEvents, auditEvents, catalogs, verifications] =
    await Promise.all([
      prisma.profile.count(),
      prisma.privacyRequest.count({ where: { request_type: "deletion" } }),
      prisma.userConsent.count(),
      prisma.profileAuditLog.count(),
      prisma.attributeCatalog.count({ where: { active: true } }),
      prisma.userVerification.count({ where: { status: "verified" } }),
    ]);
  return { profiles, deletionRequests, consentEvents, auditEvents, catalogs, verifications };
}

export default async function AdminDashboardPage() {
  const s = await stats();
  const tiles = [
    { label: "Profiles", value: s.profiles, href: "/admin/audit/users" },
    { label: "Deletion requests", value: s.deletionRequests, href: "/admin/audit/users" },
    { label: "Consent events", value: s.consentEvents, href: "/admin/audit/users" },
    { label: "User audit events", value: s.auditEvents, href: "/admin/audit/users" },
    { label: "Verified identities", value: s.verifications, href: "/admin/audit/users" },
    { label: "Active catalogs", value: s.catalogs, href: "/admin/catalogs" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Profile Admin</CardTitle>
        <CardDescription>
          Read-only overview. Use the navigation to view user activity, admin activity, or
          manage attribute catalogs.
        </CardDescription>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface-muted)] p-4 transition hover:bg-[var(--color-kobil-surface)]"
            >
              <div className="text-2xl font-semibold text-[var(--color-kobil-text)]">
                {t.value}
              </div>
              <div className="mt-1 text-sm text-[var(--color-kobil-text-muted)]">{t.label}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
