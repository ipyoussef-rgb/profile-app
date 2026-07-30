"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveIdentityAction, type SaveResult } from "@/app/profile/edit/actions";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Field,
  PageHeading,
  inputClass,
} from "@/components/ui/Card";
import { getCopy, type Locale } from "@/lib/copy";
import type { IdpProfileSnapshot } from "@/lib/idp-prefill";
import {
  GENDER_OPTIONS,
  TITLE_OPTIONS,
  countryOptions,
  optionsFor,
} from "@/lib/idp-options";
import { BirthdateField, PhoneField } from "@/components/profile/inputs";
import { birthdateIsoToKobil } from "@/lib/schemas/profile";

const actionLink =
  "flex min-h-[var(--tap-kobil)] items-center justify-center rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] px-4 py-3 text-center text-base font-medium text-[var(--color-kobil-text)] transition-colors hover:border-[var(--color-kobil-primary)] hover:bg-[var(--color-kobil-primary-tint)] hover:text-[var(--color-kobil-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kobil-ring)]";

export function EditForm({
  idp,
  locale = "de",
}: {
  idp: IdpProfileSnapshot;
  locale?: Locale;
}) {
  const t = getCopy(locale);

  const [idResult, setIdResult] = useState<SaveResult | null>(null);
  const [idPending, startIdTransition] = useTransition();

  function submitIdentity(form: FormData) {
    startIdTransition(async () => setIdResult(await saveIdentityAction(form)));
  }

  return (
    <div className="space-y-4">
      <PageHeading title={t.edit.pageTitle} />

      {/* Identity attributes (KOBIL Identity) */}
      <form action={submitIdentity} className="space-y-0">
        <Card>
          <CardTitle>{t.identity.sectionTitle}</CardTitle>
          <CardDescription>{t.identity.sectionHelper}</CardDescription>

          {!idp.configured ? (
            <p className="mb-3 text-[15px] text-[var(--color-kobil-danger)]">
              {t.identity.notConfigured}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title / gender are selects whose stored value is the option KEY
                ("Ph.D.", "Male"); the visible label is locale-dependent. */}
            <Field label={t.fields.title}>
              <select
                name="title"
                defaultValue={idp.data.title ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              >
                {optionsFor(TITLE_OPTIONS, locale).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.fields.gender}>
              <select
                name="gender"
                defaultValue={idp.data.gender ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              >
                {/* No empty option in the realm, so offer one to allow clearing. */}
                <option value="">—</option>
                {optionsFor(GENDER_OPTIONS, locale).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.fields.first_name}>
              <input
                name="first_name"
                defaultValue={idp.data.first_name ?? ""}
                maxLength={80}
                autoComplete="given-name"
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
            <Field label={t.fields.last_name}>
              <input
                name="last_name"
                defaultValue={idp.data.last_name ?? ""}
                maxLength={80}
                autoComplete="family-name"
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
            <Field label={t.fields.phone}>
              <PhoneField name="phone" value={idp.data.phone} disabled={!idp.configured} />
            </Field>
            <Field label={t.fields.fax}>
              <PhoneField name="fax" value={idp.data.fax} disabled={!idp.configured} />
            </Field>
            <Field label={t.fields.birthdate}>
              <BirthdateField
                name="birthdate"
                value={birthdateIsoToKobil(idp.data.birthdate)}
                disabled={!idp.configured}
              />
            </Field>
          </div>

          <fieldset className="mt-2">
            <legend className="mb-2 text-[15px] font-medium text-[var(--color-kobil-text)]">
              {t.fields.address}
            </legend>
            <p className="mb-3 text-[13px] text-[var(--color-kobil-text-muted)]">
              {t.edit.helpers.address}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* All ISO 3166-1 countries, localised at runtime, Germany pinned
                  to the top as the realm's preferred option. */}
              <Field label={t.fields.country}>
                <select
                  name="address.country"
                  defaultValue={idp.data.address.country ?? ""}
                  autoComplete="country"
                  disabled={!idp.configured}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {countryOptions(locale).map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.fields.organization}>
                <input
                  name="address.organization"
                  defaultValue={idp.data.address.organization ?? ""}
                  maxLength={120}
                  autoComplete="organization"
                  disabled={!idp.configured}
                  className={inputClass}
                />
              </Field>
              <Field label={t.fields.street}>
                <input
                  name="address.street"
                  placeholder={t.fields.street}
                  defaultValue={idp.data.address.street ?? ""}
                  autoComplete="address-line1"
                  disabled={!idp.configured}
                  className={inputClass}
                />
              </Field>
              <Field label={t.fields.supplement}>
                <input
                  name="address.supplement"
                  defaultValue={idp.data.address.supplement ?? ""}
                  maxLength={120}
                  autoComplete="address-line2"
                  disabled={!idp.configured}
                  className={inputClass}
                />
              </Field>
              <Field label={t.fields.postal_code}>
                <input
                  name="address.postal_code"
                  placeholder={t.fields.postal_code}
                  defaultValue={idp.data.address.postal_code ?? ""}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  disabled={!idp.configured}
                  className={inputClass}
                />
              </Field>
              <Field label={t.fields.locality}>
                <input
                  name="address.locality"
                  placeholder={t.fields.locality}
                  defaultValue={idp.data.address.locality ?? ""}
                  autoComplete="address-level2"
                  disabled={!idp.configured}
                  className={inputClass}
                />
              </Field>
            </div>
          </fieldset>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              aria-busy={idPending}
              disabled={idPending || !idp.configured}
            >
              {idPending ? t.edit.saving : t.edit.saveIdentity}
            </Button>
            {idResult?.ok ? (
              <span className="text-[15px] text-[var(--color-kobil-success)]">{t.edit.saved}</span>
            ) : null}
            {idResult && !idResult.ok ? (
              <span className="text-[15px] text-[var(--color-kobil-danger)]">
                {idResult.error === "validation" ? t.errors.validation : idResult.error}
              </span>
            ) : null}
          </div>
          {idResult && !idResult.ok && idResult.fieldErrors ? (
            <ul className="mt-2 list-inside list-disc text-[13px] text-[var(--color-kobil-danger)]">
              {Object.entries(idResult.fieldErrors).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong>: {v}
                </li>
              ))}
            </ul>
          ) : null}
          {idResult?.ok && idResult.warning ? (
            <p
              role="status"
              className="mt-3 rounded-[var(--radius-kobil-sm)] bg-[var(--color-kobil-warning-tint)] px-3 py-2 text-[13px] text-[var(--color-kobil-warning)] ring-1 ring-inset ring-[var(--color-kobil-warning)]/20"
            >
              {idResult.warning}
            </p>
          ) : null}
        </Card>
      </form>

      {/* Email / password — handled by KOBIL's dedicated headless clients. */}
      <Card>
        <CardTitle>{t.edit.securityTitle}</CardTitle>
        <CardDescription>{t.edit.idpHelper}</CardDescription>

        <div className="grid gap-3 sm:grid-cols-2">
          <a href="/api/auth/idp-action?action=email" className={actionLink}>
            {t.edit.changeEmail}
          </a>
          <a href="/api/auth/idp-action?action=password" className={actionLink}>
            {t.edit.changePassword}
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-kobil-border)] pt-4">
          {idp.data.email ? (
            <span className="text-[13px] text-[var(--color-kobil-text-muted)]">
              {t.fields.email}: {idp.data.email}
            </span>
          ) : null}
          {idp.data.email_verified === true ? (
            <Badge tone="success">{t.identity.emailVerified}</Badge>
          ) : idp.data.email_verified === false ? (
            <Badge tone="danger">{t.identity.emailNotVerified}</Badge>
          ) : null}
        </div>
      </Card>

      <Link
        href="/profile"
        className="inline-flex min-h-[var(--tap-kobil)] items-center text-[15px] font-medium text-[var(--color-kobil-primary)] underline"
      >
        ← {t.back.toProfile}
      </Link>
    </div>
  );
}
