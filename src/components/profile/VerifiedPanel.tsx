"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui/Card";

type IdentityStatus =
  | { status: "not_verified" }
  | {
      status: string;
      method: string | null;
      assurance_level: string | null;
      verified_at: Date | string | null;
      expires_at: Date | string | null;
    };

type AgeClaim = {
  claim: "age_over_16" | "age_over_18" | "age_over_21";
  verified: boolean;
  method?: string;
  assurance_level?: string | null;
  verified_at?: Date | string;
  expires_at?: Date | string | null;
};

export function VerifiedPanel({
  identity,
  age,
}: {
  identity: IdentityStatus;
  age: AgeClaim[];
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function startEid() {
    startTransition(async () => {
      setMsg(null);
      try {
        const res = await fetch("/api/me/verifications/eid/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purpose: "identity_verification" }),
        });
        if (!res.ok) {
          setMsg(`Start failed (${res.status}).`);
          return;
        }
        const body = (await res.json()) as {
          verification_url: string;
          tc_token_url?: string;
          method: string;
        };

        // Prefer the AusweisApp deep link if the provider gave us a tcTokenURL.
        // Real AusweisApp client listens at 127.0.0.1:24727; deep link works
        // on devices that have AusweisApp installed.
        if (body.tc_token_url) {
          const eidUrl = `eid://127.0.0.1:24727/eID-Client?tcTokenURL=${encodeURIComponent(body.tc_token_url)}`;
          window.location.href = eidUrl;
          return;
        }
        window.location.href = body.verification_url;
      } catch (e) {
        setMsg(`Error: ${e instanceof Error ? e.message : "unknown"}`);
      }
    });
  }

  const identityBadge =
    identity.status === "verified" ? (
      <Badge tone="success">Verified</Badge>
    ) : identity.status === "not_verified" ? (
      <Badge>Not verified</Badge>
    ) : (
      <Badge tone="danger">{identity.status}</Badge>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Identity verification</CardTitle>
        <CardDescription>
          Verified identity information comes from a trusted identity provider and cannot be
          edited manually. Your full ID document is not stored in your profile.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-3">
          {identityBadge}
          {identity.status !== "not_verified" && "method" in identity && identity.method ? (
            <span className="text-xs text-[var(--color-kobil-text-muted)]">
              method: {identity.method}
              {identity.assurance_level ? ` · assurance: ${identity.assurance_level}` : ""}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={startEid} disabled={pending}>
            {pending ? "…" : "Verify with AusweisApp"}
          </Button>
          {msg && <span className="text-sm text-[var(--color-kobil-danger)]">{msg}</span>}
        </div>
        <p className="mt-2 text-xs text-[var(--color-kobil-text-muted)]">
          For age checks we store only the result needed (e.g. whether you are over 18). Your
          full date of birth is not stored unless legally required.
        </p>
      </Card>

      <Card>
        <CardTitle>Age verification</CardTitle>
        <ul className="space-y-2 text-sm">
          {age.map((a) => (
            <li key={a.claim} className="flex items-center gap-3">
              <span className="w-32 text-[var(--color-kobil-text-muted)]">
                {a.claim.replace("age_over_", "Over ")}
              </span>
              {a.verified ? (
                <Badge tone="success">yes</Badge>
              ) : (
                <Badge>not checked</Badge>
              )}
              {a.verified && a.assurance_level ? (
                <span className="text-xs text-[var(--color-kobil-text-muted)]">
                  · assurance: {a.assurance_level}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
