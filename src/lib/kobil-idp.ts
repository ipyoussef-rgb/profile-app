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

/** Defensive shape — many tenants emit attributes flat or wrapped under
 *  `attributes.{key}[0]`. We normalize a small set of fields used by prefill. */
export type KobilIdpUser = {
  id: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[] | string | undefined>;
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
    logEvent("warn", "kobil_get_user_404", { url });
    return null;
  }
  if (!res.ok) {
    let body = "";
    try {
      body = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    logEvent("warn", "kobil_get_user_failed", { status: res.status, url, body });
    throw new Error(`KOBIL getUserInfo returned ${res.status}`);
  }
  const json = (await res.json()) as KobilIdpUser;
  // Diagnostic — logs only key NAMES, never values, so PII stays out of logs.
  logEvent("info", "kobil_get_user_ok", {
    top_keys: Object.keys(json),
    attribute_keys: json.attributes ? Object.keys(json.attributes) : [],
  });
  return json;
}

export type KobilIdpUserPatch = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  attributes: Record<string, string[]>;
}>;

export async function updateUserInIdp(email: string, patch: KobilIdpUserPatch): Promise<void> {
  const token = await getServiceToken();
  const url = `${usersBase()}/${encodeURIComponent(email)}`;

  // KOBIL Users API: PATCH `/v3_user/{email}` with a partial body.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PATCH",
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
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* ignore */
    }
    logEvent("warn", "kobil_update_user_failed", { status: res.status, url, body: text.slice(0, 200) });
    throw new Error(`KOBIL updateProfileUser returned ${res.status}`);
  }
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
