import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { AttributePicker } from "@/components/profile/AttributePicker";
import { PageHeading } from "@/components/ui/Card";
import { DEFAULT_LOCALE, getCopy } from "@/lib/copy";

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

  const t = getCopy(DEFAULT_LOCALE);

  return (
    <div className="space-y-4">
      <PageHeading title={t.attributes.title} subtitle={t.attributes.saveHint} />
      {catalogs.map((c) => (
        <AttributePicker
          key={c.id}
          catalogId={c.id}
          catalogSlug={c.slug}
          title={DEFAULT_LOCALE === "de" ? c.name_de : c.name_en}
          description={null}
          multiSelect={c.multi_select}
          values={c.values.map((v) => ({
            id: v.id,
            slug: v.slug,
            label_en: v.label_en,
            label_de: v.label_de,
          }))}
          initialSelected={Array.from(selectedByCatalog.get(c.id) ?? [])}
          locale={DEFAULT_LOCALE}
        />
      ))}
      {catalogs.length === 0 && (
        <p className="text-[15px] text-[var(--color-kobil-text-muted)]">
          Es sind derzeit keine Kategorien aktiv. Bitte wenden Sie sich an einen Administrator.
        </p>
      )}
      <Link
        href="/profile"
        className="inline-flex min-h-[var(--tap-kobil)] items-center text-[15px] font-medium text-[var(--color-kobil-primary)] underline"
      >
        ← {t.back.toProfile}
      </Link>
    </div>
  );
}
