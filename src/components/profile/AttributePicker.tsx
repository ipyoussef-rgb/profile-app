"use client";

import { useState, useTransition } from "react";
import { saveAttributeSelectionAction } from "@/app/profile/attributes/actions";
import { Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";

type Value = { id: string; slug: string; label_en: string; label_de: string };

export function AttributePicker({
  catalogId,
  catalogSlug,
  title,
  description,
  multiSelect,
  values,
  initialSelected,
  locale = "en",
}: {
  catalogId: string;
  catalogSlug: string;
  title: string;
  description: string | null;
  multiSelect: boolean;
  values: Value[];
  initialSelected: string[];
  locale?: "en" | "de";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiSelect) next.clear();
        next.add(id);
      }
      return next;
    });
    setDirty(true);
    setMsg(null);
  }

  function save() {
    startTransition(async () => {
      const r = await saveAttributeSelectionAction(catalogId, Array.from(selected));
      setMsg(
        r.ok
          ? { ok: true, text: locale === "de" ? "Gespeichert." : "Saved." }
          : {
              ok: false,
              text:
                (locale === "de" ? "Fehler: " : "Error: ") + (r.error ?? "unknown"),
            },
      );
      if (r.ok) setDirty(false);
    });
  }

  const helper =
    locale === "de"
      ? "Optional. Wird zur Personalisierung Ihres Profils verwendet — Sie können die Auswahl jederzeit entfernen."
      : "Optional. Used only to personalize your profile. You can remove this at any time.";
  const counter =
    locale === "de"
      ? `${selected.size} ausgewählt`
      : `${selected.size} selected`;
  const modeBadge = multiSelect
    ? locale === "de"
      ? "Mehrfachauswahl"
      : "Multi-select"
    : locale === "de"
      ? "Einfachauswahl"
      : "Single-select";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <span className="rounded-full border border-[var(--color-kobil-border)] px-3 py-1 text-[13px] uppercase tracking-wider text-[var(--color-kobil-text-muted)]">
          {modeBadge}
        </span>
      </div>

      <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-kobil-text-muted)]">
        {helper}
      </p>

      {values.length === 0 ? (
        <p className="rounded-[var(--radius-kobil-sm)] border border-dashed border-[var(--color-kobil-border)] px-3 py-4 text-center text-sm text-[var(--color-kobil-text-muted)]">
          {locale === "de" ? "Noch keine Werte für " : "No values configured yet for "}
          <code className="rounded bg-[var(--color-kobil-surface-muted)] px-1 py-0.5 text-xs">
            {catalogSlug}
          </code>
          .
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => {
            const active = selected.has(v.id);
            const label = locale === "de" ? v.label_de : v.label_en;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => toggle(v.id)}
                aria-pressed={active}
                className={`inline-flex min-h-[var(--tap-kobil)] items-center rounded-full border px-5 py-2.5 text-base font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kobil-ring)] focus-visible:ring-offset-2 active:scale-[0.97] ${
                  active
                    ? "border-[var(--color-kobil-primary)] bg-[var(--color-kobil-primary)] text-white shadow-[var(--shadow-kobil-sm)]"
                    : "border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] text-[var(--color-kobil-text)] hover:border-[var(--color-kobil-primary)] hover:bg-[var(--color-kobil-primary-tint)] hover:text-[var(--color-kobil-primary)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-kobil-border)] pt-4">
        <span className="text-[13px] text-[var(--color-kobil-text-muted)]">{counter}</span>
        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={`text-sm ${
                msg.ok
                  ? "text-[var(--color-kobil-success)]"
                  : "text-[var(--color-kobil-danger)]"
              }`}
            >
              {msg.text}
            </span>
          )}
          <Button type="button" onClick={save} disabled={pending || !dirty}>
            {pending
              ? locale === "de"
                ? "Speichere…"
                : "Saving…"
              : locale === "de"
                ? "Speichern"
                : "Save"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
