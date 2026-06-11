"use client";

import { useEffect, useState, useTransition } from "react";
import { requestDeletionAction } from "@/app/profile/data-and-account/actions";
import { Button, Card, CardDescription, CardTitle, PageHeading } from "@/components/ui/Card";
import { getCopy, type Locale } from "@/lib/copy";

type PrivacyRequest = {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
};

export function DataAccount({
  initialRequests,
  locale = "en",
}: {
  initialRequests: PrivacyRequest[];
  locale?: Locale;
}) {
  const t = getCopy(locale);
  const [confirming, setConfirming] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [pending, startTransition] = useTransition();
  const [deletionError, setDeletionError] = useState<string | null>(null);

  // Lock the confirm button for 5s after opening the modal — prevents accidental
  // double-tap. (UX rule from the plan.)
  useEffect(() => {
    if (!confirming) {
      setConfirmReady(false);
      return;
    }
    setConfirmReady(false);
    const id = setTimeout(() => setConfirmReady(true), 5000);
    return () => clearTimeout(id);
  }, [confirming]);

  // Modal a11y: close on Escape and move focus into the dialog (onto the safe
  // "Cancel" action) when it opens.
  useEffect(() => {
    if (!confirming) return;
    document.getElementById("delete-modal-cancel")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  function downloadExport() {
    // Server returns Content-Disposition: attachment — browser handles the save.
    window.location.href = "/api/me/profile/export";
  }

  function confirmDelete() {
    startTransition(async () => {
      setDeletionError(null);
      const r = await requestDeletionAction();
      if (!r.ok) {
        setDeletionError(r.error ?? "error");
        return;
      }
      setConfirming(false);
      // Append optimistic request entry; backend has actually created it too.
      setRequests((prev) => [
        {
          id: crypto.randomUUID(),
          request_type: "deletion",
          status: "received",
          requested_at: new Date().toISOString(),
          completed_at: null,
        },
        ...prev,
      ]);
    });
  }

  return (
    <div className="space-y-4">
      <PageHeading title={t.data.title} />

      <Card>
        <CardTitle>{t.data.exportTitle}</CardTitle>
        <CardDescription>{t.data.exportDescription}</CardDescription>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={downloadExport}>
          {t.data.exportButton}
        </Button>
      </Card>

      <Card>
        <CardTitle>{t.data.deleteTitle}</CardTitle>
        <CardDescription>{t.data.deleteDescription}</CardDescription>
        <Button variant="danger" className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
          {t.data.deleteButton}
        </Button>
      </Card>

      <Card>
        <CardTitle>{t.data.requestsTitle}</CardTitle>
        {requests.length === 0 ? (
          <CardDescription>{t.data.requestsEmpty}</CardDescription>
        ) : (
          <ul className="divide-y divide-[var(--color-kobil-border)] text-base">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                <div>
                  <div className="font-medium text-[var(--color-kobil-text)]">
                    {t.data.requestType[r.request_type as "export" | "deletion"] ?? r.request_type}
                  </div>
                  <div className="text-[13px] text-[var(--color-kobil-text-muted)]">
                    {new Date(r.requested_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-[13px] text-[var(--color-kobil-text-muted)]">
                  {t.data.requestStatus[r.status as keyof typeof t.data.requestStatus] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirming ? (
        <div className="fixed inset-0 z-10 flex items-end justify-center p-4 sm:items-center">
          {/* Accessible backdrop: a real button so it's keyboard-operable and
              passes a11y lint, instead of a click handler on a plain div. */}
          <button
            type="button"
            aria-label={t.data.deleteCancel}
            onClick={() => setConfirming(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="relative w-full max-w-sm rounded-[var(--radius-kobil)] bg-[var(--color-kobil-surface)] p-5 shadow-lg sm:max-w-md sm:p-6"
          >
            <h2 id="delete-confirm-title" className="text-xl font-semibold">
              {t.data.deleteConfirmTitle}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-kobil-text-muted)]">
              {t.data.deleteConfirmBody}
            </p>
            {deletionError ? (
              <p role="alert" className="mt-2 text-[15px] text-[var(--color-kobil-danger)]">
                {t.errors.server}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                id="delete-modal-cancel"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                {t.data.deleteCancel}
              </Button>
              <Button
                variant="danger"
                className="w-full sm:w-auto"
                onClick={confirmDelete}
                disabled={!confirmReady || pending}
                title={!confirmReady ? t.data.deleteConfirmWait : undefined}
              >
                {pending ? "…" : t.data.deleteConfirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
