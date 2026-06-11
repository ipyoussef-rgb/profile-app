// Server-side client for the KOBIL Identity REST API.
// Uses the client_credentials grant against the realm's token endpoint, then
// calls the IDP Users API (getUserInfo / updateProfileUser).
//
// References:
//   https://developer.kobil.com/api/idp#tag/Users/operation/getUserInfo
//   https://developer.kobil.com/api/idp#tag/Users/operation/updateProfileUser

import { decodeJwt } from "jose";
import { env } from "./env";
import { logEvent } from "./safe-log";

type TokenCache = { token: string; expiresAt: number };
let cached: TokenCache | null = null;
const SAFETY_MARGIN_SECONDS = 30;

export class KobilIdpNotConfiguredError extends Error {
  constructor() {
    super("KOBIL service client is not configured");
  }
}

function requireServiceClient() {
  const e = env();
  if (!e.KOBIL_SERVICE_CLIENT_ID || !e.KOBIL_SERVICE_CLIENT_SECRET) {
    throw new KobilIdpNotConfiguredError();
  }
  return { id: e.KOBIL_SERVICE_CLIENT_ID, secret: e.KOBIL_SERVICE_CLIENT_SECRET, issuer: e.KOBIL_IDP_ISSUER };
}

export async function getServiceToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - SAFETY_MARGIN_SECONDS > now) return cached.token;

  const { id, secret, issuer } = requireServiceClient();
  const tokenUrl = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    logEvent("error", "kobil_service_token_failed", { status: res.status });
    throw new Error(`KOBIL token endpoint returned ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: now + (json.expires_in ?? 300) };

  // One-shot diagnostic per fresh token: dump audience, scope, azp, and the
  // resource_access role map (key NAMES + role NAMES only — no PII). Helps
  // figure out which permission the v3_user endpoint expects when it 401s.
  try {
    const payload = decodeJwt(json.access_token) as Record<string, unknown>;
    const ra = payload["realm_access"] as { roles?: string[] } | undefined;
    const resa = payload["resource_access"] as Record<string, { roles?: string[] }> | undefined;
    logEvent("info", "kobil_service_token_issued", {
      aud: payload["aud"],
      azp: payload["azp"],
      scope: payload["scope"],
      iss: payload["iss"],
      realm_roles: ra?.roles ?? [],
      resource_access_keys: resa ? Object.keys(resa) : [],
      resource_access_roles: resa
        ? Object.fromEntries(
            Object.entries(resa).map(([k, v]) => [k, v?.roles ?? []]),
          )
        : {},
    });
  } catch {
    /* token isn't a JWT (opaque) — nothing to log */
  }
  return cached.token;
}

/** KOBIL response shape. Per Postman test 2026-05-15, KOBIL wraps the actual
 *  user object in `{ message, status, subSystem, data: {…} }`. The fields
 *  below describe the inner `data` payload — getUserFromIdp() unwraps it. */
export type KobilIdpUser = {
  id?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  admin?: boolean;
  attributes?: Record<string, string[] | string | undefined>;
};

type KobilApiEnvelope = {
  message?: string;
  status?: string;
  data?: KobilIdpUser;
};

/** KOBIL custom Users API. Per the tenant docs, the endpoint is
 *  `{issuer}/v3_user/{email}` — keyed by email, not by UUID sub. Override
 *  via KOBIL_IDP_USERS_API if the tenant exposes a different base path. */
function defaultUsersBase(issuer: string): string {
  return `${issuer.replace(/\/$/, "")}/v3_user`;
}

function usersBase(): string {
  const e = env();
  return (e.KOBIL_IDP_USERS_API ?? defaultUsersBase(e.KOBIL_IDP_ISSUER)).replace(/\/$/, "");
}

export async function getUserFromIdp(email: string): Promise<KobilIdpUser | null> {
  const token = await getServiceToken();
  const url = `${usersBase()}/${encodeURIComponent(email)}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 404) {
    // Log the endpoint base only — the full url embeds the user's email (PII).
    logEvent("warn", "kobil_get_user_404", { endpoint: usersBase() });
    return null;
  }
  if (!res.ok) {
    let body = "";
    try {
      body = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    logEvent("warn", "kobil_get_user_failed", { status: res.status, endpoint: usersBase(), body });
    throw new Error(`KOBIL getUserInfo returned ${res.status}`);
  }
  const raw = (await res.json()) as KobilApiEnvelope | KobilIdpUser;
  // Unwrap KOBIL's `{ message, status, data: { … } }` envelope. Fall back to
  // a raw user object if a tenant returns the user directly (defensive).
  const user: KobilIdpUser = (raw as KobilApiEnvelope).data ?? (raw as KobilIdpUser);

  logEvent("info", "kobil_get_user_ok", {
    envelope_keys: Object.keys(raw as Record<string, unknown>),
    top_keys: Object.keys(user),
    attribute_keys: user.attributes ? Object.keys(user.attributes) : [],
  });
  return user;
}

export type KobilIdpUserPatch = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  attributes: Record<string, string[]>;
}>;

/** Result of a write + read-back verification. `verified` is true only when
 *  every attribute key we sent is present (non-empty) in the re-fetched user.
 *  Lets callers tell "KOBIL accepted AND persisted" apart from "KOBIL returned
 *  200 but silently dropped the attributes" (e.g. undeclared attributes under
 *  Keycloak's declarative User Profile). */
export type UpdateVerification = {
  verified: boolean;
  sentAttributeKeys: string[];
  persistedKeys: string[];
  missingKeys: string[];
};

export async function updateUserInIdp(
  email: string,
  patch: KobilIdpUserPatch,
): Promise<UpdateVerification> {
  // KOBIL `updateUser`: PUT {issuer}/v3_user/{email}/update. This tenant
  // returned USER_NOT_FOUND when called with the UUID even though the GET
  // by UUID succeeds (verified 2026-05-18) — keying by email works.
  const token = await getServiceToken();
  const url = `${usersBase()}/${encodeURIComponent(email)}/update`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  let text = "";
  try {
    text = await res.text();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    // On 405 surface the Allow header so we know exactly which verbs the
    // endpoint accepts — saves a guessing round-trip next time. Log the
    // endpoint base only (the full url embeds the user's email).
    const allow = res.status === 405 ? res.headers.get("allow") : undefined;
    logEvent("warn", "kobil_update_user_failed", {
      status: res.status,
      endpoint: usersBase(),
      body: text.slice(0, 200),
      ...(allow ? { allow } : {}),
    });
    throw new Error(`KOBIL updateProfileUser returned ${res.status}`);
  }

  // Note: we intentionally do NOT log the response body here — on success
  // KOBIL echoes the full user object (name, email, address = PII). We log
  // only which field keys we sent.
  const sentAttributeKeys = Object.keys(patch.attributes ?? {});
  logEvent("info", "kobil_update_user_ok", {
    status: res.status,
    sent_scalar_keys: Object.keys(patch).filter((k) => k !== "attributes"),
    sent_attribute_keys: sentAttributeKeys,
  });

  // Read-back verification: re-fetch the user and confirm each attribute we
  // sent actually landed. This is the automated equivalent of "save, then
  // check via getUserInfo" — the result is logged AND returned to the caller.
  let persistedKeys = sentAttributeKeys;
  let missingKeys: string[] = [];
  if (sentAttributeKeys.length > 0) {
    try {
      const after = await getUserFromIdp(email);
      if (after) {
        persistedKeys = sentAttributeKeys.filter(
          (k) => readIdpAttribute(after, k) !== undefined,
        );
        missingKeys = sentAttributeKeys.filter((k) => !persistedKeys.includes(k));
      }
    } catch {
      /* verification GET failed — leave optimistic persistedKeys */
    }
    logEvent(missingKeys.length > 0 ? "warn" : "info", "kobil_update_user_verify", {
      sent_attribute_keys: sentAttributeKeys,
      persisted_keys: persistedKeys,
      missing_keys: missingKeys,
    });
  }

  return {
    verified: missingKeys.length === 0,
    sentAttributeKeys,
    persistedKeys,
    missingKeys,
  };
}

/** Read helper that copes with flat OR wrapped attributes. */
export function readIdpAttribute(user: KobilIdpUser, ...names: string[]): string | undefined {
  const attrs = user.attributes ?? {};
  for (const name of names) {
    const flat = (user as unknown as Record<string, unknown>)[name];
    const wrapped = attrs[name];
    for (const v of [flat, wrapped]) {
      if (typeof v === "string" && v.length > 0) return v;
      if (Array.isArray(v) && typeof v[0] === "string" && v[0].length > 0) return v[0];
    }
  }
  return undefined;
}
