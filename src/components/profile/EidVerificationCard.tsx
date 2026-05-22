"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";

export type EidVerifiedView = {
  verified_at: string;
  given_names: string | null;
  family_names: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  street: string | null;
  city: string | null;
  zip_code: string | null;
  country: string | null;
};

export function EidVerificationCard({
  initial,
  devMockEnabled,
  statusFromQuery,
  locale = "de",
}: {
  initial: EidVerifiedView | null;
  devMockEnabled: boolean;
  statusFromQuery: "pending" | "failed" | "expired" | "ok" | null;
  locale?: "de" | "en";
}) {
  const [data, setData] = useState<EidVerifiedView | null>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // After AusweisApp redirects back, poll briefly in case /api/eid/result
  // arrived a moment after our refresh hit. Cheap polling for ~10 seconds.
  useEffect(() => {
    if (statusFromQuery !== "pending" || data) return;
    let cancelled = false;
    let attempts = 0;
    const t = setInterval(async () => {
      attempts++;
      const r = await fetch("/api/me/eid", { cache: "no-store" });
      if (cancelled) return;
      if (r.ok) {
        const j = (await r.json()) as { verification: EidVerifiedView | null };
        if (j.verification) {
          setData(j.verification);
          clearInterval(t);
          return;
        }
      }
      if (attempts >= 10) clearInterval(t);
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [statusFromQuery, data]);

  function start() {
    startTransition(async () => {
      setMsg(null);
      const r = await fetch("/api/eid/start", { method: "POST" });
      const j = (await r.json()) as { ok: boolean; clientUrl?: string; error?: string };
      if (!j.ok || !j.clientUrl) {
        setMsg({
          ok: false,
          text:
            locale === "de"
              ? `Konnte eID-Sitzung nicht starten (${j.error ?? "unknown"}).`
              : `Could not start eID session (${j.error ?? "unknown"}).`,
        });
        return;
      }
      // Open AusweisApp on the user's machine. Browser navigates to the
      // localhost AusweisApp entrypoint; if AusweisApp isn't installed, the
      // browser will show its own "couldn't open" UI.
      window.location.href = j.clientUrl;
    });
  }

  function devComplete() {
    startTransition(async () => {
      const r = await fetch("/api/eid/dev-mock-complete", { method: "POST" });
      if (r.ok) {
        const re = await fetch("/api/me/eid", { cache: "no-store" });
        const j = (await re.json()) as { verification: EidVerifiedView | null };
        setData(j.verification);
      } else {
        setMsg({
          ok: false,
          text: locale === "de" ? "Mock fehlgeschlagen." : "Mock failed.",
        });
      }
    });
  }

  if (data) {
    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>
              {locale === "de" ? "Identität verifiziert" : "Identity verified"}
            </CardTitle>
            <CardDescription>
              {locale === "de"
                ? "Diese Personendaten wurden mit Ihrem Personalausweis (eID) verifiziert."
                : "These personal details were verified using your eID."}
            </CardDescription>
          </div>
          <Badge tone="success">
            ✓ {locale === "de" ? "Verifiziert" : "Verified"}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row
            label={locale === "de" ? "Vorname(n)" : "Given name(s)"}
            value={data.given_names}
          />
          <Row
            label={locale === "de" ? "Nachname" : "Family name"}
            value={data.family_names}
          />
          <Row
            label={locale === "de" ? "Geburtsdatum" : "Date of birth"}
            value={data.date_of_birth}
          />
          <Row
            label={locale === "de" ? "Geburtsort" : "Place of birth"}
            value={data.place_of_birth}
          />
          <Row
            label={locale === "de" ? "Adresse" : "Address"}
            value={formatAddress(data)}
          />
        </dl>

        <p className="mt-4 text-xs text-[var(--color-kobil-text-muted)]">
          {locale === "de" ? "Verifiziert am " : "Verified on "}
          {new Date(data.verified_at).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle>
            {locale === "de" ? "eID-Verifizierung" : "eID verification"}
          </CardTitle>
          <CardDescription>
            {locale === "de"
              ? "Verifizieren Sie Ihre Personendaten (Name, Adresse, Geburtsdatum) mit dem Personalausweis (nPA) und der AusweisApp."
              : "Verify your personal data (name, address, date of birth) using the German eID card and AusweisApp."}
          </CardDescription>
        </div>
        <Badge>{locale === "de" ? "Nicht verifiziert" : "Not verified"}</Badge>
      </div>

      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-[var(--color-kobil-text-muted)]">
        <li>
          {locale === "de"
            ? "AusweisApp muss auf Ihrem Gerät installiert und gestartet sein."
            : "AusweisApp must be installed and running on your device."}
        </li>
        <li>
          {locale === "de"
            ? "Personalausweis + 6-stellige PIN bereithalten."
            : "Have your German eID card and 6-digit PIN ready."}
        </li>
        <li>
          {locale === "de"
            ? "Auf den Button klicken — AusweisApp öffnet sich, anschließend werden Sie hierher zurückgeleitet."
            : "Click the button — AusweisApp opens, then you'll be redirected back here."}
        </li>
      </ol>

      {statusFromQuery === "failed" && (
        <p className="mb-3 rounded-[var(--radius-kobil-sm)] bg-red-50 px-3 py-2 text-sm text-[var(--color-kobil-danger)]">
          {locale === "de"
            ? "Die letzte Verifizierung ist fehlgeschlagen. Bitte erneut versuchen."
            : "The last verification failed. Please try again."}
        </p>
      )}
      {statusFromQuery === "expired" && (
        <p className="mb-3 rounded-[var(--radius-kobil-sm)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {locale === "de"
            ? "Die Sitzung ist abgelaufen. Bitte erneut starten."
            : "The session expired. Please start again."}
        </p>
      )}
      {statusFromQuery === "pending" && (
        <p className="mb-3 rounded-[var(--radius-kobil-sm)] bg-[var(--color-kobil-primary-tint)] px-3 py-2 text-sm text-[var(--color-kobil-primary)]">
          {locale === "de"
            ? "Warte auf Bestätigung vom eID-Server …"
            : "Waiting for eID-Server confirmation …"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={start} disabled={pending}>
          {pending
            ? locale === "de"
              ? "Starte …"
              : "Starting …"
            : locale === "de"
              ? "Mit eID verifizieren"
              : "Verify with eID"}
        </Button>
        {devMockEnabled && (
          <Button type="button" variant="secondary" onClick={devComplete} disabled={pending}>
            {locale === "de" ? "Dev-Mock abschließen" : "Complete dev mock"}
          </Button>
        )}
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
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[var(--color-kobil-text-muted)]">{label}</dt>
      <dd className="text-[var(--color-kobil-text)]">{value || "—"}</dd>
    </div>
  );
}

function formatAddress(d: EidVerifiedView): string | null {
  const parts = [
    d.street,
    [d.zip_code, d.city].filter(Boolean).join(" "),
    d.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
