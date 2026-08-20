import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { audit } from "@/lib/audit";
import { loadIdpProfile } from "@/lib/idp-prefill";
import { prisma } from "@/lib/db";
import { Overview } from "@/components/profile/Overview";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DEFAULT_LOCALE, getCopy } from "@/lib/copy";
import { resumeResetGrace } from "@/lib/env";
import { ResumeToStart } from "@/components/layout/ResumeToStart";
import { DiscardedNotice } from "@/components/layout/DiscardedNotice";

export const dynamic = "force-dynamic";

// The landing page IS the user's attributes. It used to be a settings menu whose
// rows opened native Super-App screens (openProfileSection); that menu is gone,
// so opening the mini-app shows the actual data straight away. /profile redirects
// here so older links and deep links still land somewhere sensible.
export default async function Home() {
  const user = await requireUserOrRedirect("/");

  const [row, idp, selections] = await Promise.all([
    getProfile(user.sub),
    loadIdpProfile(user.email),
    prisma.userAttributeValue.findMany({ where: { user_id: user.sub } }),
  ]);

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

  const profile = {
    display_name: row?.display_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    profile_visibility: row?.profile_visibility ?? "private",
  };

  if (!idp.configured) {
    idp.data.username = user.preferred_username ?? null;
    idp.data.email = user.email ?? null;
    idp.data.email_verified = user.email_verified ?? null;
  }

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
  const attributeItems = Array.from(grouped.values()).sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );

  const t = getCopy(DEFAULT_LOCALE);
  const grace = resumeResetGrace();

  return (
    <div className="min-h-screen bg-[var(--color-kobil-surface-muted)]">
      {/* Slim brand band. It carries the device safe-area so the first card is
          never clipped by the notch / status bar, which the deleted menu header
          used to do (requires viewport-fit=cover, set in layout). */}
      <header
        className="bg-[var(--color-kobil-header)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <p className="py-3 text-center text-[15px] font-semibold uppercase tracking-[0.2em] text-white">
          Profil
        </p>
      </header>

      {/* This page is the reset target, so the guard never navigates away from
          here; it is mounted only to keep the heartbeat ticking. */}
      <ResumeToStart pristineSeconds={grace.pristine} dirtySeconds={grace.dirty} />

      <main
        className="mx-auto max-w-3xl space-y-4 px-4 py-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <DiscardedNotice />

        <Overview profile={profile} idp={idp} locale={DEFAULT_LOCALE} />

        <Card>
          <CardTitle>{t.attributes.title}</CardTitle>
          <CardDescription>{t.attributes.overviewHint}</CardDescription>

          {attributeItems.length === 0 ? (
            <p className="text-[15px] text-[var(--color-kobil-text-muted)]">
              {t.attributes.empty}{" "}
              <Link
                href="/profile/attributes"
                className="font-medium text-[var(--color-kobil-primary)] underline"
              >
                {t.attributes.emptyCta}
              </Link>
              .
            </p>
          ) : (
            <dl className="space-y-4">
              {attributeItems.map((c) => (
                <div key={c.slug}>
                  <dt className="text-[13px] text-[var(--color-kobil-text-muted)]">{c.name}</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-2">
                    {c.values.map((v) => (
                      <Badge key={v.id} tone="primary">{v.label}</Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <Link href="/profile/attributes" className="mt-5 block sm:inline-block">
            <Button variant="secondary" className="w-full sm:w-auto">
              {t.attributes.edit}
            </Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
