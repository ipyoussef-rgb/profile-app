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
  }

  function save() {
    startTransition(async () => {
      const r = await saveAttributeSelectionAction(catalogId, Array.from(selected));
      setMsg(
        r.ok
          ? { ok: true, text: "Saved" }
          : { ok: false, text: `Error: ${r.error ?? "unknown"}` },
      );
    });
  }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
      <p className="mb-3 text-xs text-[var(--color-kobil-text-muted)]">
        Optional. Used only to personalize your profile. You can remove this at any time.
      </p>
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
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--color-kobil-primary)] bg-[var(--color-kobil-primary)] text-white"
                  : "border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]"
              }`}
            >
              {label}
            </button>
          );
        })}
        {values.length === 0 && (
          <span className="text-sm text-[var(--color-kobil-text-muted)]">
            No values configured yet for <code>{catalogSlug}</code>.
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        {msg && (
          <span
            className={`text-sm ${
              msg.ok ? "text-[var(--color-kobil-success)]" : "text-[var(--color-kobil-danger)]"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </Card>
  );
}
