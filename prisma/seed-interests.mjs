// Seeds the two "Interessen & Eigenschaften" catalogs (topics + Worms
// districts) so the admin doesn't have to type 20 values by hand.
//
// Run deliberately — it is NOT wired into migrations or `postinstall`:
//   npm run seed:interests
//
// Requires the same DB env the app uses: PROFILE_DATABASE_URL (see
// prisma/schema.prisma). Idempotent: catalogs and values are upserted on their
// stable slugs, so re-running never duplicates rows. It does re-apply the
// labels below, so edit them here if you want different defaults. Nothing is
// deleted — values an admin added stay untouched, and a catalog an admin
// deactivated stays deactivated (`active` is deliberately not in the update).
//
// Source of the option lists: the KOBIL Identity `user-attributes` config for
// the Worms tenant (`personalInterests`). Interests are deliberately NOT taken
// from the IDP at runtime: they are product preferences owned by this app,
// while identity data stays in KOBIL Identity.
//
// NOTE: the district list is duplicated in KOBIL Identity as the `district`
// identity attribute (where the user *lives*, single-select). These districts
// are what the user wants to *follow* (multi-select). If a new Ortsteil is
// added to the realm's `district` options, add it here too.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATALOGS = [
  {
    slug: "topics",
    name_de: "Themen",
    name_en: "Topics",
    multi_select: true,
    values: [
      { slug: "city-services", label_de: "Stadtservices", label_en: "City Services" },
      { slug: "city-politics", label_de: "Stadt & Politik", label_en: "City & Politics" },
      { slug: "traffic", label_de: "Verkehr", label_en: "Traffic" },
      { slug: "events", label_de: "Veranstaltungen", label_en: "Events" },
      { slug: "citizens", label_de: "Gesellschaft", label_en: "Citizens" },
      { slug: "commerce", label_de: "Wirtschaft", label_en: "Commerce" },
    ],
  },
  {
    slug: "districts",
    name_de: "Stadtteile",
    name_en: "Districts",
    multi_select: true,
    values: [
      { slug: "zentrum", label_de: "Zentrum", label_en: "Zentrum" },
      { slug: "abenheim", label_de: "Abenheim", label_en: "Abenheim" },
      { slug: "heppenheim", label_de: "Heppenheim", label_en: "Heppenheim" },
      { slug: "herrnsheim", label_de: "Herrnsheim", label_en: "Herrnsheim" },
      { slug: "hochheim", label_de: "Hochheim", label_en: "Hochheim" },
      { slug: "horchheim", label_de: "Horchheim", label_en: "Horchheim" },
      { slug: "ibersheim", label_de: "Ibersheim", label_en: "Ibersheim" },
      { slug: "leiselheim", label_de: "Leiselheim", label_en: "Leiselheim" },
      { slug: "neuhausen", label_de: "Neuhausen", label_en: "Neuhausen" },
      { slug: "pfeddersheim", label_de: "Pfeddersheim", label_en: "Pfeddersheim" },
      { slug: "pfiffligheim", label_de: "Pfiffligheim", label_en: "Pfiffligheim" },
      { slug: "rheinduerkheim", label_de: "Rheindürkheim", label_en: "Rheindürkheim" },
      { slug: "weinsheim", label_de: "Weinsheim", label_en: "Weinsheim" },
      { slug: "wiesoppenheim", label_de: "Wiesoppenheim", label_en: "Wiesoppenheim" },
    ],
  },
];

async function main() {
  for (const c of CATALOGS) {
    const catalog = await prisma.attributeCatalog.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name_de: c.name_de,
        name_en: c.name_en,
        multi_select: c.multi_select,
      },
      // Leave `active` alone: an admin may have deactivated the catalog on
      // purpose and a re-run must not silently switch it back on.
      update: { name_de: c.name_de, name_en: c.name_en, multi_select: c.multi_select },
    });

    for (const [i, v] of c.values.entries()) {
      await prisma.attributeCatalogValue.upsert({
        where: { catalog_id_slug: { catalog_id: catalog.id, slug: v.slug } },
        create: {
          catalog_id: catalog.id,
          slug: v.slug,
          label_de: v.label_de,
          label_en: v.label_en,
          sort_order: i,
        },
        update: { label_de: v.label_de, label_en: v.label_en, sort_order: i },
      });
    }

    console.log(`seeded catalog "${c.slug}" with ${c.values.length} values`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
