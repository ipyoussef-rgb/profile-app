import Link from "next/link";
import { getCopy, type Locale } from "@/lib/copy";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ageOverFromBirthdate } from "@/lib/schemas/profile";
import type { IdpProfileSnapshot } from "@/lib/idp-prefill";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  profile_visibility: string;
};

export function Overview({
  profile,
  idp,
  locale = "de",
}: {
  profile: Profile;
  idp: IdpProfileSnapshot;
  locale?: Locale;
}) {
  const t = getCopy(locale);
  const fullName =
    [idp.data.first_name, idp.data.last_name].filter(Boolean).join(" ") || null;
  const display = profile.display_name || fullName || idp.data.username || idp.data.email || "—";
  const initial = (display[0] || "?").toUpperCase();
  const age = ageOverFromBirthdate(idp.data.birthdate);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-kobil-primary)] text-2xl font-semibold text-white"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-semibold text-[var(--color-kobil-text)]">
                {display}
              </h1>
              <Badge>
                {t.overview.visibilityLabel}: {profile.profile_visibility}
              </Badge>
            </div>
            {fullName && profile.display_name && (
              <p className="mt-1 text-sm text-[var(--color-kobil-text-muted)]">{fullName}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-kobil-text-muted)]">
              {idp.data.locale ? <span>{t.fields.locale}: {idp.data.locale}</span> : null}
              {idp.data.email ? <span>{idp.data.email}</span> : null}
            </div>
          </div>
          <Link href="/profile/edit" className="shrink-0">
            <Button variant="secondary">{t.overview.edit}</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>{t.identity.sectionTitle}</CardTitle>
        <CardDescription>{t.identity.emailReadOnly}</CardDescription>
        {!idp.configured ? (
          <p className="text-sm text-[var(--color-kobil-text-muted)]">
            {t.identity.notConfigured}
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label={t.fields.first_name} value={idp.data.first_name} />
            <Row label={t.fields.last_name} value={idp.data.last_name} />
            <Row label={t.fields.username} value={idp.data.username} />
            <Row
              label={t.fields.email}
              value={
                <span className="flex flex-wrap items-center gap-2">
                  {idp.data.email ?? "—"}
                  {idp.data.email_verified === true ? (
                    <Badge tone="success">{t.identity.emailVerified}</Badge>
                  ) : idp.data.email_verified === false ? (
                    <Badge tone="danger">{t.identity.emailNotVerified}</Badge>
                  ) : null}
                </span>
              }
            />
            <Row label={t.fields.phone} value={idp.data.phone} />
            <Row label={t.fields.locale} value={idp.data.locale} />
            <Row label={t.fields.birthdate} value={idp.data.birthdate} />
            <Row
              label={t.fields.address}
              value={formatAddress(idp.data.address, locale)}
            />
          </dl>
        )}
      </Card>

      <Card>
        <CardTitle>Alter</CardTitle>
        {age.over_18 === null ? (
          <p className="text-sm text-[var(--color-kobil-text-muted)]">
            {t.overview.ageUnknown}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-2">
              {t.overview.ageOver16}:
              {age.over_16 ? (
                <Badge tone="success">{t.overview.yes}</Badge>
              ) : (
                <Badge tone="danger">{t.overview.no}</Badge>
              )}
            </span>
            <span className="flex items-center gap-2">
              {t.overview.ageOver18}:
              {age.over_18 ? (
                <Badge tone="success">{t.overview.yes}</Badge>
              ) : (
                <Badge tone="danger">{t.overview.no}</Badge>
              )}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[var(--color-kobil-text-muted)]">{label}</dt>
      <dd className="text-[var(--color-kobil-text)]">{value || "—"}</dd>
    </div>
  );
}

function formatAddress(
  a: IdpProfileSnapshot["data"]["address"],
  _locale: Locale,
): string | null {
  const parts = [a.street, [a.postal_code, a.locality].filter(Boolean).join(" "), a.country]
    .filter(Boolean)
    .join(", ");
  return parts.length > 0 ? parts : null;
}
