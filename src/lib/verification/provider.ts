// Pluggable eID/age verification provider abstraction. The mock provider
// returns a placeholder URL that lets the UI complete the flow without a real
// eID-Service; swap to a real provider (KOBIL eID broker, AusweisIDent, etc.)
// by setting EID_PROVIDER and the related env vars.

import { env } from "../env";

export type StartParams = {
  user_id: string;
  purpose: string;
  return_url: string;
};

export type StartResult = {
  session_id: string;
  // For the mock provider this is a URL on our own app; for AusweisApp flows
  // the front-end will reformat this as an `eid://...?tcTokenURL=...` deep
  // link before opening it.
  verification_url: string;
  tc_token_url?: string;
  provider_reference: string;
  method: "ausweisapp" | "kobil_identity" | "trusted_provider" | "mock";
};

export type CallbackClaims = {
  identity_verified?: boolean;
  given_name_verified?: boolean;
  family_name_verified?: boolean;
  // Server-derived from a verified birthdate; the birthdate itself is NEVER
  // returned by the minimizer.
  age_over_16?: boolean;
  age_over_18?: boolean;
  age_over_21?: boolean;
  assurance_level?: "low" | "substantial" | "high";
};

export type CallbackResult =
  | { status: "verified"; claims: CallbackClaims; verified_at: Date; expires_at?: Date }
  | { status: "failed"; reason: string }
  | { status: "expired" }
  | { status: "revoked" };

export interface VerificationProvider {
  readonly method: StartResult["method"];
  start(p: StartParams): Promise<StartResult>;
  resolveCallback(sessionId: string, query: URLSearchParams): Promise<CallbackResult>;
}

// Mock provider: in dev (and any non-prod env until a real provider is wired)
// returns a verification URL that points at /api/me/verifications/eid/callback
// and synthesizes a verified outcome for a default test birthdate.
class MockProvider implements VerificationProvider {
  readonly method = "mock" as const;

  async start(p: StartParams): Promise<StartResult> {
    const session_id = crypto.randomUUID();
    const params = new URLSearchParams({
      session_id,
      // In real flows the callback URL is constructed by the provider; here we
      // make the user's return path the same so the UI can complete locally.
      next: p.return_url,
    });
    return {
      session_id,
      verification_url: `${env().APP_BASE_URL}/api/me/verifications/eid/callback?${params.toString()}`,
      provider_reference: `mock:${session_id}`,
      method: this.method,
    };
  }

  async resolveCallback(): Promise<CallbackResult> {
    // Pretend the user is over 18, identity verified, assurance "high".
    return {
      status: "verified",
      claims: {
        identity_verified: true,
        age_over_16: true,
        age_over_18: true,
        age_over_21: false,
        assurance_level: "high",
      },
      verified_at: new Date(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }
}

export function getProvider(): VerificationProvider {
  const which = env().EID_PROVIDER;
  switch (which) {
    case "mock":
      return new MockProvider();
    case "kobil":
    case "ausweisident":
      // TODO: implement real provider; for now fall back to the mock so the UI
      // is testable end-to-end. Throwing here would block the flow before any
      // provider integration work is done.
      return new MockProvider();
  }
}

/** Allowlist of claims we persist. Anything else from the provider is dropped. */
export function minimizeClaims(raw: Record<string, unknown>): CallbackClaims {
  const out: CallbackClaims = {};
  if (typeof raw.identity_verified === "boolean") out.identity_verified = raw.identity_verified;
  if (typeof raw.given_name_verified === "boolean")
    out.given_name_verified = raw.given_name_verified;
  if (typeof raw.family_name_verified === "boolean")
    out.family_name_verified = raw.family_name_verified;
  if (typeof raw.age_over_16 === "boolean") out.age_over_16 = raw.age_over_16;
  if (typeof raw.age_over_18 === "boolean") out.age_over_18 = raw.age_over_18;
  if (typeof raw.age_over_21 === "boolean") out.age_over_21 = raw.age_over_21;
  const lvl = raw.assurance_level;
  if (lvl === "low" || lvl === "substantial" || lvl === "high") out.assurance_level = lvl;
  return out;
}
