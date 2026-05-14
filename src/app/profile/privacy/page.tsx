import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getCopy } from "@/lib/copy";
import { CONSENT_PURPOSES, LEGAL_BASIS, type ConsentPurpose } from "@/lib/schemas/consents";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ConsentToggle } from "@/components/privacy/ConsentToggle";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const user = await requireUserOrRedirect("/profile/privacy");
  const rows = await prisma.userConsent.findMany({
    where: { user_id: user.sub },
    orderBy: { created_at: "desc" },
  });

  const latestByPurpose = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!latestByPurpose.has(r.purpose)) latestByPurpose.set(r.purpose, r);
  }
  const t = getCopy("en");

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{t.privacy.title}</CardTitle>
        <CardDescription>{t.privacy.intro}</CardDescription>
        <div className="-mt-1">
          {(CONSENT_PURPOSES as readonly ConsentPurpose[]).map((p) => {
            const r = latestByPurpose.get(p);
            const purposeCopy = t.privacy.purposes[p];
            return (
              <ConsentToggle
                key={p}
                purpose={p}
                initialGranted={r?.granted ?? false}
                title={purposeCopy.title}
                description={purposeCopy.description}
                lastUpdatedLabel={t.privacy.lastUpdated}
                lastUpdatedAt={r?.created_at?.toISOString() ?? null}
                grantLabel={t.privacy.grant}
                revokeLabel={t.privacy.revoke}
              />
            );
          })}
        </div>
        <p className="mt-4 text-xs text-[var(--color-kobil-text-muted)]">
          Legal basis: consent (GDPR Art. 6(1)(a)). Withdrawing a consent is as easy as granting it.
        </p>
      </Card>
      <p className="px-1 text-xs text-[var(--color-kobil-text-muted)]">
        Each change appends a new immutable record to the consent ledger; previous decisions are
        preserved for accountability ({Object.keys(LEGAL_BASIS).length} purposes tracked).
      </p>
    </div>
  );
}
