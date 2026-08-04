import { requireAdminOrRedirect } from "@/lib/admin-current-user";
import { AdminHeader } from "@/components/layout/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminOrRedirect("/admin");
  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      <AdminHeader username={admin.preferred_username ?? admin.email ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
