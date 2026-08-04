"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardDescription, CardTitle, Field } from "@/components/ui/Card";
import {
  createCatalogValueAction,
  updateCatalogValueAction,
} from "@/app/admin/catalogs/actions";

const inputClass =
  "w-full rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-2 py-1 text-sm focus:border-[var(--color-kobil-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-kobil-primary)]/20";

type Value = {
  id: string;
  slug: string;
  label_en: string;
  label_de: string;
  sort_order: number;
  active: boolean;
};

export function CatalogValuesEditor({
  catalogId,
  catalogSlug,
  values,
}: {
  catalogId: string;
  catalogSlug: string;
  values: Value[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function addValue(form: FormData) {
    startTransition(async () => {
      const input = {
        slug: String(form.get("slug") ?? "").trim(),
        label_en: String(form.get("label_en") ?? "").trim(),
        label_de: String(form.get("label_de") ?? "").trim(),
        sort_order: Number(form.get("sort_order") ?? 0) || 0,
      };
      const r = await createCatalogValueAction(catalogId, input);
      setMsg(r.ok ? { ok: true, text: "Value added." } : { ok: false, text: `Error: ${r.error}` });
    });
  }

  function toggleActive(v: Value) {
    startTransition(async () => {
      const r = await updateCatalogValueAction(catalogId, v.id, { active: !v.active });
      setMsg(r.ok ? { ok: true, text: "Value updated." } : { ok: false, text: `Error: ${r.error}` });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Values in <code>{catalogSlug}</code></CardTitle>
        <CardDescription>
          Existing user selections of deactivated values are preserved but hidden from the
          user-facing picker.
        </CardDescription>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs text-[var(--color-kobil-text-muted)]">
              <tr>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Slug</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">EN</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">DE</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Sort</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3">Active</th>
                <th className="border-b border-[var(--color-kobil-border)] py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {values.map((v) => (
                <tr key={v.id} className="border-b border-[var(--color-kobil-border)]/50">
                  <td className="py-2 pr-3 font-mono text-xs">{v.slug}</td>
                  <td className="py-2 pr-3">{v.label_en}</td>
                  <td className="py-2 pr-3">{v.label_de}</td>
                  <td className="py-2 pr-3 text-xs">{v.sort_order}</td>
                  <td className="py-2 pr-3 text-xs">{v.active ? "yes" : "no"}</td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleActive(v)}
                      className="rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] px-2 py-1 text-xs hover:bg-[var(--color-kobil-surface-muted)] disabled:opacity-60"
                    >
                      {v.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {values.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-[var(--color-kobil-text-muted)]">
                    No values yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle>Add a value</CardTitle>
        <form action={addValue} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="slug">
              <input name="slug" required pattern="^[a-z0-9_]+$" className={inputClass} />
            </Field>
            <Field label="sort order">
              <input name="sort_order" type="number" min={0} max={9999} defaultValue={0} className={inputClass} />
            </Field>
            <Field label="Label (English)">
              <input name="label_en" required className={inputClass} />
            </Field>
            <Field label="Label (German)">
              <input name="label_de" required className={inputClass} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Add value"}
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
    </div>
  );
}
