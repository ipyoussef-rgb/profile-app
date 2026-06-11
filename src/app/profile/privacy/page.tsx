import { requireUserOrRedirect } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { getCopy } from "@/lib/copy";
import { CONSENT_PURPOSES, LEGAL_BASIS, type ConsentPurpose } from "@/lib/schemas/consents";
import { Card, PageHeading } from "@/components/ui/Card";
import { ConsentToggle } from "@/components/privacy/ConsentToggle";
import { DEFAULT_LOCALE } from "@/lib/copy";
import Link from "next/link";

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
  const t = getCopy(DEFAULT_LOCALE);

  return (
    <div className="space-y-4">
      <PageHeading title={t.privacy.title} subtitle={t.privacy.intro} />
      <Card>
        <div>
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
          Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Ein Widerruf ist genauso
          einfach möglich wie die Erteilung.
        </p>
      </Card>
      <p className="px-1 text-xs text-[var(--color-kobil-text-muted)]">
        Jede Änderung erzeugt einen neuen, unveränderlichen Eintrag im Einwilligungs-Ledger;
        frühere Entscheidungen bleiben für Nachweiszwecke erhalten ({Object.keys(LEGAL_BASIS).length} Zwecke).
      </p>
      <Link
        href="/profile"
        className="inline-flex min-h-[var(--tap-kobil)] items-center text-[15px] font-medium text-[var(--color-kobil-primary)] underline"
      >
        ← {t.back.toProfile}
      </Link>
    </div>
  );
}
