import Link from "next/link";
import { getCopy, type Locale } from "@/lib/copy";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: string | null;
  timezone: string | null;
  profile_visibility: string;
  identity: {
    username: string | null;
    email: string | null;
    email_verified: boolean | null;
  };
};

export function Overview({ profile, locale = "en" }: { profile: Profile; locale?: Locale }) {
  const t = getCopy(locale);
  const display = profile.display_name || profile.identity.username || profile.identity.email || "—";

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-kobil-primary)] text-2xl font-semibold text-white"
            aria-hidden
          >
            {(display[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-[var(--color-kobil-text)]">{display}</h1>
              <Badge>{t.overview.visibilityLabel}: {profile.profile_visibility}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--color-kobil-text-muted)]">
              {profile.bio || t.overview.emptyBio}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-kobil-text-muted)]">
              {profile.locale ? <span>{profile.locale}</span> : null}
              {profile.timezone ? <span>{profile.timezone}</span> : null}
            </div>
          </div>
          <Link href="/profile/edit">
            <Button variant="secondary">{t.overview.edit}</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardTitle>Identity ({t.identity.viaKobilIdentity})</CardTitle>
        <CardDescription>{t.identity.emailReadOnly}</CardDescription>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-kobil-text-muted)]">Username</dt>
            <dd className="text-[var(--color-kobil-text)]">{profile.identity.username ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-kobil-text-muted)]">Email</dt>
            <dd className="flex items-center gap-2 text-[var(--color-kobil-text)]">
              {profile.identity.email ?? "—"}
              {profile.identity.email_verified === true ? (
                <Badge tone="success">{t.identity.emailVerified}</Badge>
              ) : profile.identity.email_verified === false ? (
                <Badge tone="danger">{t.identity.emailNotVerified}</Badge>
              ) : null}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
