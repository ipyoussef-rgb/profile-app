import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/current-user";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DEFAULT_LOCALE } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage() {
  const user = await requireUserOrRedirect("/profile");

  const selections = await prisma.userAttributeValue.findMany({
    where: { user_id: user.sub },
  });

  const catalogIds = Array.from(new Set(selections.map((s) => s.catalog_id)));
  const valueIds = Array.from(new Set(selections.map((s) => s.value_id)));

  const [catalogs, values] = await Promise.all([
    catalogIds.length
      ? prisma.attributeCatalog.findMany({
          where: { id: { in: catalogIds }, active: true },
        })
      : Promise.resolve([]),
    valueIds.length
      ? prisma.attributeCatalogValue.findMany({
          where: { id: { in: valueIds }, active: true },
          orderBy: [{ sort_order: "asc" }, { slug: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_read",
  });

  const catalogById = new Map(catalogs.map((c) => [c.id, c]));
  const valueById = new Map(values.map((v) => [v.id, v]));

  const grouped = new Map<
    string,
    {
      slug: string;
      name: string;
      values: { id: string; label: string; sort_order: number }[];
    }
  >();
  for (const s of selections) {
    const c = catalogById.get(s.catalog_id);
    const v = valueById.get(s.value_id);
    if (!c || !v) continue;
    if (!grouped.has(c.id)) {
      grouped.set(c.id, {
        slug: c.slug,
        name: DEFAULT_LOCALE === "de" ? c.name_de : c.name_en,
        values: [],
      });
    }
    grouped.get(c.id)!.values.push({
      id: v.id,
      label: DEFAULT_LOCALE === "de" ? v.label_de : v.label_en,
      sort_order: v.sort_order,
    });
  }
  for (const g of grouped.values()) {
    g.values.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  }
  const items = Array.from(grouped.values()).sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Mein Profil</CardTitle>
            <CardDescription>
              Diese Auswahlen hast du unter „Attribute" gespeichert.
            </CardDescription>
          </div>
          <Link href="/profile/attributes">
            <Button variant="secondary">Bearbeiten</Button>
          </Link>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-kobil-text-muted)]">
            Du hast noch nichts ausgewählt.{" "}
            <Link
              href="/profile/attributes"
              className="text-[var(--color-kobil-primary)] underline"
            >
              Jetzt auswählen
            </Link>
            .
          </p>
        </Card>
      ) : (
        items.map((c) => (
          <Card key={c.slug}>
            <CardTitle>{c.name}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              {c.values.map((v) => (
                <Badge key={v.id}>{v.label}</Badge>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
