"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  saveAppProfileAction,
  saveIdentityAction,
  type SaveResult,
} from "@/app/profile/edit/actions";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Field,
} from "@/components/ui/Card";
import { getCopy, type Locale } from "@/lib/copy";
import { PROFILE_VISIBILITY } from "@/lib/schemas/profile";
import type { IdpProfileSnapshot } from "@/lib/idp-prefill";

type AppProfileInitial = {
  display_name: string | null;
  avatar_url: string | null;
  profile_visibility: string;
};

const inputClass =
  "w-full rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-3 py-2 text-sm focus:border-[var(--color-kobil-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-kobil-primary)]/20";

const linkButton =
  "inline-flex items-center rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-3 py-1.5 text-sm text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]";

export function EditForm({
  initial,
  idp,
  locale = "de",
}: {
  initial: AppProfileInitial;
  idp: IdpProfileSnapshot;
  locale?: Locale;
}) {
  const t = getCopy(locale);

  const [appResult, setAppResult] = useState<SaveResult | null>(null);
  const [idResult, setIdResult] = useState<SaveResult | null>(null);
  const [appPending, startAppTransition] = useTransition();
  const [idPending, startIdTransition] = useTransition();

  function submitApp(form: FormData) {
    startAppTransition(async () => setAppResult(await saveAppProfileAction(form)));
  }
  function submitIdentity(form: FormData) {
    startIdTransition(async () => setIdResult(await saveIdentityAction(form)));
  }

  return (
    <div className="space-y-4">
      {/* Identity attributes (KOBIL Identity) */}
      <form action={submitIdentity} className="space-y-0">
        <Card>
          <CardTitle>{t.identity.sectionTitle}</CardTitle>
          <CardDescription>{t.identity.sectionHelper}</CardDescription>

          {!idp.configured ? (
            <p className="mb-3 text-sm text-[var(--color-kobil-danger)]">
              {t.identity.notConfigured}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.fields.first_name}>
              <input
                name="first_name"
                defaultValue={idp.data.first_name ?? ""}
                maxLength={80}
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
            <Field label={t.fields.last_name}>
              <input
                name="last_name"
                defaultValue={idp.data.last_name ?? ""}
                maxLength={80}
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
            <Field label={t.fields.locale} helper="z. B. de, de-DE, en-US">
              <input
                name="locale"
                defaultValue={idp.data.locale ?? ""}
                placeholder="de"
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
            <Field label={t.fields.birthdate} helper="YYYY-MM-DD">
              <input
                name="birthdate"
                type="date"
                defaultValue={idp.data.birthdate ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              />
            </Field>
          </div>

          <fieldset className="mt-2">
            <legend className="mb-2 text-sm font-medium text-[var(--color-kobil-text)]">
              {t.fields.address}
            </legend>
            <p className="mb-2 text-xs text-[var(--color-kobil-text-muted)]">
              {t.edit.helpers.address}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="address.street"
                placeholder={t.fields.street}
                defaultValue={idp.data.address.street ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              />
              <input
                name="address.locality"
                placeholder={t.fields.locality}
                defaultValue={idp.data.address.locality ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              />
              <input
                name="address.postal_code"
                placeholder={t.fields.postal_code}
                defaultValue={idp.data.address.postal_code ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              />
              <input
                name="address.country"
                placeholder={t.fields.country}
                maxLength={2}
                defaultValue={idp.data.address.country ?? ""}
                disabled={!idp.configured}
                className={inputClass}
              />
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={idPending || !idp.configured}>
              {idPending ? "…" : t.edit.saveIdentity}
            </Button>
            {idResult?.ok ? (
              <span className="text-sm text-[var(--color-kobil-success)]">{t.edit.saved}</span>
            ) : null}
            {idResult && !idResult.ok ? (
              <span className="text-sm text-[var(--color-kobil-danger)]">
                {idResult.error === "validation" ? t.errors.validation : idResult.error}
              </span>
            ) : null}
          </div>
          {idResult && !idResult.ok && idResult.fieldErrors ? (
            <ul className="mt-2 list-inside list-disc text-xs text-[var(--color-kobil-danger)]">
              {Object.entries(idResult.fieldErrors).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong>: {v}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-xs text-[var(--color-kobil-text-muted)]">
            {t.edit.idpHelper}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/api/auth/login?kc_action=UPDATE_EMAIL&returnTo=%2Fprofile"
              className={linkButton}
            >
              {t.edit.changeEmail}
            </a>
            <a
              href="/api/auth/login?kc_action=UPDATE_PHONE_NUMBER&returnTo=%2Fprofile"
              className={linkButton}
            >
              {t.edit.changePhone}
            </a>
            <a
              href="/api/auth/login?kc_action=UPDATE_PASSWORD&returnTo=%2Fprofile"
              className={linkButton}
            >
              {t.edit.changePassword}
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-kobil-border)] pt-3">
            {idp.data.email ? (
              <span className="text-xs text-[var(--color-kobil-text-muted)]">
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
      </form>

      {/* App-managed profile */}
      <form action={submitApp} className="space-y-0">
        <Card>
          <CardTitle>{t.edit.appTitle}</CardTitle>
          <CardDescription>{t.edit.appHelper}</CardDescription>

          <Field label={t.fields.display_name}>
            <input
              name="display_name"
              defaultValue={initial.display_name ?? ""}
              maxLength={80}
              className={inputClass}
            />
          </Field>

          <Field label={t.fields.avatar_url} helper={t.edit.helpers.optional}>
            <input
              name="avatar_url"
              type="url"
              defaultValue={initial.avatar_url ?? ""}
              className={inputClass}
            />
          </Field>

          <Field label={t.fields.profile_visibility}>
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

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={appPending}>
              {appPending ? "…" : t.edit.saveApp}
            </Button>
            {appResult?.ok ? (
              <span className="text-sm text-[var(--color-kobil-success)]">{t.edit.saved}</span>
            ) : null}
            {appResult && !appResult.ok ? (
              <span className="text-sm text-[var(--color-kobil-danger)]">
                {appResult.error === "validation" ? t.errors.validation : t.edit.error}
              </span>
            ) : null}
          </div>
          {appResult && !appResult.ok && appResult.fieldErrors ? (
            <ul className="mt-2 list-inside list-disc text-xs text-[var(--color-kobil-danger)]">
              {Object.entries(appResult.fieldErrors).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong>: {v}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </form>

      <Link href="/profile" className="inline-block text-sm text-[var(--color-kobil-primary)] underline">
        ← {t.back.toProfile}
      </Link>
    </div>
  );
}
