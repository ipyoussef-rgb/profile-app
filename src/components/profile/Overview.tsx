import Link from "next/link";
import { getCopy, type Locale } from "@/lib/copy";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ageOverFromBirthdate } from "@/lib/schemas/profile";
import type { IdpProfileSnapshot } from "@/lib/idp-prefill";
import {
  GENDER_OPTIONS,
  TITLE_OPTIONS,
  countryLabel,
  labelFor,
} from "@/lib/idp-options";

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
  // First letter of the first name plus first letter of the last name. Falls back
  // to the first two word-ish parts of whatever is displayed (username or email)
  // when the IDP has no name yet, so the avatar is never a bare "?".
  const initials =
    [idp.data.first_name, idp.data.last_name]
      .map((n) => n?.trim().charAt(0))
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    display
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() ||
    "?";
  const age = ageOverFromBirthdate(idp.data.birthdate);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-kobil-primary)] to-[var(--color-kobil-secondary)] text-2xl font-semibold text-white ring-4 ring-[var(--color-kobil-primary-tint)] sm:h-20 sm:w-20 sm:text-3xl"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-[var(--color-kobil-text)] sm:text-3xl">
                {display}
              </h1>
              <Badge tone="primary">
                {t.overview.visibilityLabel}: {profile.profile_visibility}
              </Badge>
            </div>
            {fullName && profile.display_name && (
              <p className="mt-1 text-[15px] text-[var(--color-kobil-text-muted)]">{fullName}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-[var(--color-kobil-text-muted)]">
              {idp.data.email ? <span>{idp.data.email}</span> : null}
            </div>
          </div>
          <Link href="/profile/edit" className="w-full shrink-0 sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">{t.overview.edit}</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>{t.identity.sectionTitle}</CardTitle>
        <CardDescription>{t.identity.emailReadOnly}</CardDescription>
        {!idp.configured ? (
          <p className="text-[15px] text-[var(--color-kobil-text-muted)]">
            {t.identity.notConfigured}
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-[15px] sm:grid-cols-2">
            {/* Selects store an option key, so translate before display —
                otherwise this reads "Ph.D." / "Male" instead of "Dr." / "Männlich". */}
            <Row label={t.fields.title} value={labelFor(TITLE_OPTIONS, idp.data.title, locale)} />
            <Row label={t.fields.first_name} value={idp.data.first_name} />
            <Row label={t.fields.last_name} value={idp.data.last_name} />
            <Row label={t.fields.gender} value={labelFor(GENDER_OPTIONS, idp.data.gender, locale)} />
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
            <Row label={t.fields.fax} value={idp.data.fax} />
            <Row
              label={t.fields.birthdate}
              value={formatBirthdateForDisplay(idp.data.birthdate, locale)}
            />
            <Row label={t.fields.organization} value={idp.data.address.organization} />
            <Row
              label={t.fields.address}
              value={formatAddress(idp.data.address, locale)}
            />
          </dl>
        )}
      </Card>

      <Card>
        <CardTitle>{t.overview.ageTitle}</CardTitle>
        {age.over_18 === null ? (
          <p className="text-[15px] text-[var(--color-kobil-text-muted)]">
            {t.overview.ageUnknown}
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 text-[15px]">
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
      <dt className="text-[13px] text-[var(--color-kobil-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--color-kobil-text)]">{value || "—"}</dd>
    </div>
  );
}

function formatBirthdateForDisplay(
  iso: string | null | undefined,
  locale: Locale,
): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return locale === "de"
    ? `${m[3]}.${m[2]}.${m[1]}`
    : `${m[1]}-${m[2]}-${m[3]}`;
}

function formatAddress(
  a: IdpProfileSnapshot["data"]["address"],
  locale: Locale,
): string | null {
  // Country is stored as an ISO code but shown by name, so "DE" reads
  // "Deutschland" here rather than leaking the raw code.
  const parts = [
    a.street,
    a.supplement,
    [a.postal_code, a.locality].filter(Boolean).join(" "),
    countryLabel(a.country, locale),
  ]
    .filter(Boolean)
    .join(", ");
  return parts.length > 0 ? parts : null;
}
