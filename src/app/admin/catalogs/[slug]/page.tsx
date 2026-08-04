import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CatalogValuesEditor } from "@/components/admin/CatalogValuesEditor";

export const dynamic = "force-dynamic";

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await prisma.attributeCatalog.findUnique({
    where: { slug },
    include: { values: { orderBy: [{ sort_order: "asc" }, { slug: "asc" }] } },
  });
  if (!catalog) notFound();

  return (
    <CatalogValuesEditor
      catalogId={catalog.id}
      catalogSlug={catalog.slug}
      values={catalog.values.map((v) => ({
        id: v.id,
        slug: v.slug,
        label_en: v.label_en,
        label_de: v.label_de,
        sort_order: v.sort_order,
        active: v.active,
      }))}
    />
  );
}
