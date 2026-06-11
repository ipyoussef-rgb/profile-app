"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { savePostfachAction } from "@/app/profile/postfach/actions";
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeading,
  inputClass,
} from "@/components/ui/Card";
import { getCopy, type Locale } from "@/lib/copy";

export function PostfachForm({
  current,
  loginEmail,
  locale = "de",
}: {
  current: string | null;
  loginEmail: string | null;
  locale?: Locale;
}) {
  const t = getCopy(locale);
  const [value, setValue] = useState(current ?? loginEmail ?? "");
  const [saved, setSaved] = useState<string | null>(current);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(form: FormData) {
    startTransition(async () => {
      setMsg(null);
      const r = await savePostfachAction(form);
      if (r.ok) {
        setSaved(value.trim().toLowerCase());
        setMsg({ ok: true, text: t.postfach.saved });
      } else {
        setMsg({
          ok: false,
          text: r.error === "invalid" ? t.postfach.invalid : `${t.errors.server} (${r.error})`,
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <PageHeading title={t.postfach.title} subtitle={t.postfach.intro} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[var(--color-kobil-text-muted)]">
            {t.postfach.currentLabel}:
          </span>
          {saved ? (
            <Badge tone="primary">{saved}</Badge>
          ) : (
            <span className="text-[15px] text-[var(--color-kobil-text-muted)]">
              {t.postfach.none}
            </span>
          )}
        </div>

        <form action={submit} className="space-y-0">
          <Field label={t.postfach.label} helper={t.postfach.helper}>
            <input
              name="postfach_email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setMsg(null);
              }}
              placeholder="name@example.com"
              className={inputClass}
            />
          </Field>

          {loginEmail && value.trim().toLowerCase() !== loginEmail.toLowerCase() ? (
            <button
              type="button"
              onClick={() => {
                setValue(loginEmail);
                setMsg(null);
              }}
              className="mb-4 inline-flex min-h-[var(--tap-kobil)] items-center text-[15px] font-medium text-[var(--color-kobil-primary)] underline"
            >
              {t.postfach.useLoginEmail} ({loginEmail})
            </button>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              aria-busy={pending}
              disabled={pending || value.trim() === ""}
            >
              {pending ? t.postfach.saving : t.postfach.save}
            </Button>
            {msg ? (
              <span
                role="status"
                className={`text-[15px] ${
                  msg.ok
                    ? "text-[var(--color-kobil-success)]"
                    : "text-[var(--color-kobil-danger)]"
                }`}
              >
                {msg.text}
              </span>
            ) : null}
          </div>
        </form>
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
