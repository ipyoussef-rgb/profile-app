"use client";

import { useState, useTransition } from "react";
import { createCatalogAction } from "@/app/admin/catalogs/actions";
import { Button, Card, CardDescription, CardTitle, Field } from "@/components/ui/Card";

const inputClass =
  "w-full rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-3 py-2 text-sm focus:border-[var(--color-kobil-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-kobil-primary)]/20";

export function CatalogCreateForm() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(form: FormData) {
    startTransition(async () => {
      const input = {
        slug: String(form.get("slug") ?? "").trim(),
        name_en: String(form.get("name_en") ?? "").trim(),
        name_de: String(form.get("name_de") ?? "").trim(),
        multi_select: form.get("multi_select") === "on",
      };
      const r = await createCatalogAction(input);
      setMsg(
        r.ok
          ? { ok: true, text: "Catalog created." }
          : { ok: false, text: `Error: ${r.error}` },
      );
    });
  }

  return (
    <Card>
      <CardTitle>Create a new catalog</CardTitle>
      <CardDescription>
        slug must be lowercase, snake_case (e.g. <code>dietary_preferences</code>).
      </CardDescription>
      <form action={submit} className="space-y-3">
        <Field label="slug">
          <input name="slug" required pattern="^[a-z0-9_]+$" className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (English)">
            <input name="name_en" required className={inputClass} />
          </Field>
          <Field label="Name (German)">
            <input name="name_de" required className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--color-kobil-text)]">
          <input type="checkbox" name="multi_select" defaultChecked /> Allow users to select multiple values
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Create catalog"}
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
      </form>
    </Card>
  );
}
