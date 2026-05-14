"use client";

import { useState, useTransition } from "react";
import { saveProfileAction, type SaveResult } from "@/app/profile/edit/actions";
import { Badge, Button, Card, CardDescription, CardTitle, Field } from "@/components/ui/Card";
import { getCopy, type Locale } from "@/lib/copy";
import { PROFILE_VISIBILITY } from "@/lib/schemas/profile";

type Initial = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: string | null;
  timezone: string | null;
  phone: string | null;
  address: { street?: string; locality?: string; postal_code?: string; country?: string } | null;
  profile_visibility: string;
};

type Identity = {
  username: string | null;
  email: string | null;
  email_verified: boolean | null;
};

const inputClass =
  "w-full rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-3 py-2 text-sm focus:border-[var(--color-kobil-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-kobil-primary)]/20";

export function EditForm({
  initial,
  identity,
  locale = "en",
}: {
  initial: Initial;
  identity: Identity;
  locale?: Locale;
}) {
  const t = getCopy(locale);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(form: FormData) {
    startTransition(async () => {
      const r = await saveProfileAction(form);
      setResult(r);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Card>
        <CardTitle>Identity ({t.identity.viaKobilIdentity})</CardTitle>
        <CardDescription>{t.identity.emailReadOnly}</CardDescription>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-kobil-text-muted)]">Username</dt>
            <dd className="text-[var(--color-kobil-text)]">{identity.username ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-kobil-text-muted)]">Email</dt>
            <dd className="flex items-center gap-2 text-[var(--color-kobil-text)]">
              {identity.email ?? "—"}
              {identity.email_verified === true ? (
                <Badge tone="success">{t.identity.emailVerified}</Badge>
              ) : identity.email_verified === false ? (
                <Badge tone="danger">{t.identity.emailNotVerified}</Badge>
              ) : null}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle>{t.edit.title}</CardTitle>
        <CardDescription>{t.edit.helpers.optional}</CardDescription>

        <Field label={t.edit.fields.display_name}>
          <input
            name="display_name"
            defaultValue={initial.display_name ?? ""}
            maxLength={80}
            className={inputClass}
          />
        </Field>

        <Field label={t.edit.fields.avatar_url} helper={t.edit.helpers.optional}>
          <input
            name="avatar_url"
            type="url"
            defaultValue={initial.avatar_url ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label={t.edit.fields.bio} helper={t.edit.helpers.optional}>
          <textarea
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={initial.bio ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.edit.fields.locale} helper="e.g. en, de-DE">
            <input
              name="locale"
              defaultValue={initial.locale ?? ""}
              placeholder="en"
              className={inputClass}
            />
          </Field>
          <Field label={t.edit.fields.timezone} helper="e.g. Europe/Berlin">
            <input
              name="timezone"
              defaultValue={initial.timezone ?? ""}
              placeholder="Europe/Berlin"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t.edit.fields.phone} helper={t.edit.helpers.phone}>
          <input
            name="phone"
            type="tel"
            defaultValue={initial.phone ?? ""}
            placeholder="+491701234567"
            className={inputClass}
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-[var(--color-kobil-text)]">
            {t.edit.fields.address}
          </legend>
          <p className="mb-2 text-xs text-[var(--color-kobil-text-muted)]">{t.edit.helpers.address}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="address.street"
              placeholder="Street"
              defaultValue={initial.address?.street ?? ""}
              className={inputClass}
            />
            <input
              name="address.locality"
              placeholder="City"
              defaultValue={initial.address?.locality ?? ""}
              className={inputClass}
            />
            <input
              name="address.postal_code"
              placeholder="Postal code"
              defaultValue={initial.address?.postal_code ?? ""}
              className={inputClass}
            />
            <input
              name="address.country"
              placeholder="Country (e.g. DE)"
              maxLength={2}
              defaultValue={initial.address?.country ?? ""}
              className={inputClass}
            />
          </div>
        </fieldset>

        <Field label={t.edit.fields.profile_visibility}>
          <select
            name="profile_visibility"
            defaultValue={initial.profile_visibility}
            className={inputClass}
          >
            {PROFILE_VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {t.edit.visibilityOptions[v]}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : t.edit.save}
          </Button>
          {result?.ok ? (
            <span className="text-sm text-[var(--color-kobil-success)]">{t.edit.saved}</span>
          ) : null}
          {result && !result.ok ? (
            <span className="text-sm text-[var(--color-kobil-danger)]">
              {result.error === "validation" ? t.errors.validation : t.edit.error}
            </span>
          ) : null}
        </div>

        {result && !result.ok && result.fieldErrors ? (
          <ul className="mt-3 list-inside list-disc text-xs text-[var(--color-kobil-danger)]">
            {Object.entries(result.fieldErrors).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {v}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </form>
  );
}
