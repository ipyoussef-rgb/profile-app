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
  eidStartUrl,
  eidStartUrlHttp,
  eidUsingDemo = false,
  statusFromQuery,
  locale = "de",
}: {
  initial: EidVerifiedView | null;
  devMockEnabled: boolean;
  eidStartUrl: string;
  eidStartUrlHttp?: string;
  eidUsingDemo?: boolean;
  statusFromQuery: "pending" | "failed" | "expired" | "ok" | null;
  locale?: "de" | "en";
}) {
  const [data, setData] = useState<EidVerifiedView | null>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sdkProbe, setSdkProbe] = useState<string | null>(null);

  async function probeSdk() {
    setSdkProbe(locale === "de" ? "Prüfe …" : "Probing …");
    try {
      // In the KOBIL Super-App mini-app context this request is intercepted
      // and forwarded to the embedded AusweisApp SDK; the response tells us
      // whether the SDK bridge is reachable at all.
      const res = await fetch("http://127.0.0.1:24727/eID-Client?Status=json", {
        method: "GET",
        mode: "cors",
        cache: "no-store",
      });
      let bodyPreview = "";
      try {
        bodyPreview = (await res.text()).slice(0, 200);
      } catch {
        /* ignore */
      }
      setSdkProbe(`HTTP ${res.status} ${res.type} — ${bodyPreview || "(no body)"}`);
    } catch (e) {
      setSdkProbe(
        `fetch failed: ${(e as Error).message ?? "unknown"}. ${
          locale === "de"
            ? "Wahrscheinlich kann der Browser/WebView 127.0.0.1:24727 nicht erreichen."
            : "Likely the browser/WebView cannot reach 127.0.0.1:24727."
        }`,
      );
    }
  }

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

  // The "Verify" button is now a real <a href={eidStartUrl}> below — that's
  // a user-gesture navigation, which is the only reliable way to reach
  // http://127.0.0.1:24727 from an HTTPS page (browsers silently block
  // programmatic window.location.href = "http://..." from HTTPS contexts).

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

      {eidUsingDemo && (
        <p className="mb-3 rounded-[var(--radius-kobil-sm)] bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {locale === "de"
            ? "Demo-Modus: ohne EID_PAOS_URL läuft die Verifizierung gegen das öffentliche Governikus-Test-PP. Nach erfolgreicher Auth landest du auf einer Governikus-Ergebnisseite, nicht hier zurück. Setze EID_PAOS_URL für den vollen Flow."
            : "Demo mode: without EID_PAOS_URL the verification runs against Governikus' public Test-PP. After a successful auth you'll land on a Governikus result page, not back here. Set EID_PAOS_URL for the full flow."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={eidStartUrl}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-kobil-sm)] bg-[var(--color-kobil-primary)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-kobil-sm)] transition-all duration-150 hover:bg-[var(--color-kobil-primary-hover)] hover:shadow-[var(--shadow-kobil-md)] active:scale-[0.98]"
        >
          {locale === "de" ? "Mit eID verifizieren" : "Verify with eID"}
        </a>
        <Button type="button" variant="secondary" onClick={probeSdk}>
          {locale === "de" ? "SDK-Status prüfen" : "Probe SDK status"}
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
      {sdkProbe && (
        <pre className="mt-3 max-h-32 overflow-auto rounded-[var(--radius-kobil-sm)] bg-[var(--color-kobil-surface-muted)] px-2 py-1.5 text-[11px] text-[var(--color-kobil-text)]">
          {sdkProbe}
        </pre>
      )}
      <details className="mt-3 text-xs text-[var(--color-kobil-text-muted)]">
        <summary className="cursor-pointer select-none">
          {locale === "de" ? "Funktioniert nicht?" : "Not working?"}
        </summary>
        <p className="mt-2 leading-relaxed">
          {locale === "de"
            ? "Hauptlink benutzt das eid:// Custom-Scheme (für Mini-Apps / Mobile). Wenn der Klick nichts tut, versuche stattdessen die HTTP-Variante (für Desktop-AusweisApp):"
            : "The primary link uses the eid:// custom scheme (for mini-apps / mobile). If clicking does nothing, try the HTTP variant instead (for desktop AusweisApp):"}
        </p>
        {eidStartUrlHttp && (
          <a
            href={eidStartUrlHttp}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] px-3 py-1.5 text-xs text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]"
          >
            {locale === "de"
              ? "Über http://127.0.0.1:24727 versuchen"
              : "Try via http://127.0.0.1:24727"}
          </a>
        )}
        <p className="mt-3 leading-relaxed">
          {locale === "de" ? "URLs zur manuellen Diagnose:" : "URLs for manual diagnostics:"}
        </p>
        <code className="mt-1 block break-all rounded bg-[var(--color-kobil-surface-muted)] px-2 py-1 text-[10px]">
          eid://: {eidStartUrl}
        </code>
        {eidStartUrlHttp && (
          <code className="mt-1 block break-all rounded bg-[var(--color-kobil-surface-muted)] px-2 py-1 text-[10px]">
            http://: {eidStartUrlHttp}
          </code>
        )}
      </details>
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
