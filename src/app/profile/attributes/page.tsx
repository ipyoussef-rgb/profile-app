import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { AttributePicker } from "@/components/profile/AttributePicker";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  const user = await requireUserOrRedirect("/profile/attributes");
  const [catalogs, selections] = await Promise.all([
    prisma.attributeCatalog.findMany({
      where: { active: true },
      orderBy: { slug: "asc" },
      include: {
        values: {
          where: { active: true },
          orderBy: [{ sort_order: "asc" }, { slug: "asc" }],
        },
      },
    }),
    prisma.userAttributeValue.findMany({ where: { user_id: user.sub } }),
  ]);

  const selectedByCatalog = new Map<string, Set<string>>();
  for (const s of selections) {
    if (!selectedByCatalog.has(s.catalog_id)) selectedByCatalog.set(s.catalog_id, new Set());
    selectedByCatalog.get(s.catalog_id)!.add(s.value_id);
  }

  return (
    <div className="space-y-4">
      {catalogs.map((c) => (
        <AttributePicker
          key={c.id}
          catalogId={c.id}
          catalogSlug={c.slug}
          title={c.name_en}
          description={null}
          multiSelect={c.multi_select}
          values={c.values.map((v) => ({
            id: v.id,
            slug: v.slug,
            label_en: v.label_en,
            label_de: v.label_de,
          }))}
          initialSelected={Array.from(selectedByCatalog.get(c.id) ?? [])}
          locale="en"
        />
      ))}
      {catalogs.length === 0 && (
        <p className="text-sm text-[var(--color-kobil-text-muted)]">
          No catalogs are currently active. Ask an admin to create one in the admin console.
        </p>
      )}
    </div>
  );
}
