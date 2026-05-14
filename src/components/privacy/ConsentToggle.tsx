"use client";

import { useState, useTransition } from "react";
import { toggleConsentAction } from "@/app/profile/privacy/actions";
import type { ConsentPurpose } from "@/lib/schemas/consents";

export function ConsentToggle({
  purpose,
  initialGranted,
  title,
  description,
  lastUpdatedLabel,
  lastUpdatedAt,
  grantLabel,
  revokeLabel,
}: {
  purpose: ConsentPurpose;
  initialGranted: boolean;
  title: string;
  description: string;
  lastUpdatedLabel: string;
  lastUpdatedAt: string | null;
  grantLabel: string;
  revokeLabel: string;
}) {
  const [granted, setGranted] = useState(initialGranted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function flip(next: boolean) {
    startTransition(async () => {
      setError(null);
      setGranted(next);
      const r = await toggleConsentAction(purpose, next);
      if (!r.ok) {
        setGranted(!next);
        setError(r.error ?? "error");
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t border-[var(--color-kobil-border)] py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--color-kobil-text)]">{title}</div>
        <p className="mt-1 text-sm text-[var(--color-kobil-text-muted)]">{description}</p>
        {lastUpdatedAt ? (
          <p className="mt-1 text-xs text-[var(--color-kobil-text-muted)]">
            {lastUpdatedLabel}: {new Date(lastUpdatedAt).toLocaleString()}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-[var(--color-kobil-danger)]">{error}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={granted}
        aria-label={granted ? revokeLabel : grantLabel}
        disabled={pending}
        onClick={() => flip(!granted)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
          granted ? "bg-[var(--color-kobil-primary)]" : "bg-[var(--color-kobil-border)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            granted ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
