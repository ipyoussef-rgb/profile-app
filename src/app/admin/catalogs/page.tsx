import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { CatalogCreateForm } from "@/components/admin/CatalogCreateForm";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const catalogs = await prisma.attributeCatalog.findMany({
    orderBy: { slug: "asc" },
    include: { _count: { select: { values: true } } },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Attribute catalogs</CardTitle>
        <CardDescription>
          Each catalog is a named list of values that end users can pick from on their profile.
          Deactivating a catalog or value hides it from end users but preserves existing
          selections for audit.
        </CardDescription>
        <ul className="divide-y divide-[var(--color-kobil-border)]">
          {catalogs.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-[var(--color-kobil-text)]">{c.name_en}</div>
                <div className="text-xs text-[var(--color-kobil-text-muted)]">
                  slug: <code>{c.slug}</code> · {c._count.values} values · {c.multi_select ? "multi-select" : "single-select"} · {c.active ? "active" : "inactive"}
                </div>
              </div>
              <Link
                href={`/admin/catalogs/${c.slug}`}
                className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1 text-sm text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]"
              >
                Manage
              </Link>
            </li>
          ))}
          {catalogs.length === 0 && (
            <li className="py-6 text-sm text-[var(--color-kobil-text-muted)]">
              No catalogs yet — create the first one below.
            </li>
          )}
        </ul>
      </Card>

      <CatalogCreateForm />
    </div>
  );
}
