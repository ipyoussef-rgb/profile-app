import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/current-user";
import { getProfile } from "@/lib/profile-service";
import { audit } from "@/lib/audit";
import { loadIdpProfile } from "@/lib/idp-prefill";
import { prisma } from "@/lib/db";
import { Overview } from "@/components/profile/Overview";
import { EidVerificationCard, type EidVerifiedView } from "@/components/profile/EidVerificationCard";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DEFAULT_LOCALE } from "@/lib/copy";
import { eidClientUrl, signEidSession } from "@/lib/eid";
import { env } from "@/lib/env";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export default async function ProfileOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ eid?: string }>;
}) {
  const user = await requireUserOrRedirect("/profile");
  const sp = (await searchParams) ?? {};
  const eidStatusRaw = sp.eid;
  const eidStatus: "pending" | "failed" | "expired" | "ok" | null =
    eidStatusRaw === "pending" || eidStatusRaw === "failed" || eidStatusRaw === "expired" || eidStatusRaw === "ok"
      ? eidStatusRaw
      : null;

  const [row, idp, selections, eid] = await Promise.all([
    getProfile(user.sub),
    loadIdpProfile(user.email),
    prisma.userAttributeValue.findMany({ where: { user_id: user.sub } }),
    prisma.eidVerification.findUnique({ where: { user_id: user.sub } }),
  ]);

  // Sign a fresh eID session JWT on every render so the rendered link is
  // always within the 10-min TTL. The browser navigates directly (anchor
  // click → user gesture) which is what bypasses HTTPS→HTTP-localhost
  // mixed-content blocks. We only need this when the user isn't already
  // verified, but cheap to always sign.
  const eidJwt = await signEidSession({ sub: user.sub, nonce: randomUUID() });
  const eidStartUrl = eidClientUrl(
    `${env().APP_BASE_URL.replace(/\/$/, "")}/api/eid/tctoken?sid=${encodeURIComponent(eidJwt)}`,
  );

  const eidView: EidVerifiedView | null = eid
    ? {
        verified_at: eid.verified_at.toISOString(),
        given_names: eid.given_names,
        family_names: eid.family_names,
        date_of_birth: eid.date_of_birth,
        place_of_birth: eid.place_of_birth,
        street: eid.street,
        city: eid.city,
        zip_code: eid.zip_code,
        country: eid.country,
      }
    : null;

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

  return (
    <div className="space-y-4">
      <EidVerificationCard
        initial={eidView}
        devMockEnabled={env().EID_DEV_MOCK}
        eidStartUrl={eidStartUrl}
        statusFromQuery={eidStatus}
        locale={DEFAULT_LOCALE}
      />

      <Overview profile={profile} idp={idp} locale={DEFAULT_LOCALE} />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Interessen & Eigenschaften</CardTitle>
            <CardDescription>
              Deine unter „Attribute" gespeicherten Auswahlen.
            </CardDescription>
          </div>
          <Link href="/profile/attributes">
            <Button variant="secondary">Bearbeiten</Button>
          </Link>
        </div>

        {attributeItems.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-kobil-text-muted)]">
            Du hast noch nichts ausgewählt.{" "}
            <Link
              href="/profile/attributes"
              className="text-[var(--color-kobil-primary)] underline"
            >
              Jetzt auswählen
            </Link>
            .
          </p>
        ) : (
          <dl className="mt-3 space-y-3">
            {attributeItems.map((c) => (
              <div key={c.slug}>
                <dt className="text-sm text-[var(--color-kobil-text-muted)]">{c.name}</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {c.values.map((v) => (
                    <Badge key={v.id} tone="primary">{v.label}</Badge>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
