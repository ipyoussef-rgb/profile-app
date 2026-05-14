// Server-side client for the KOBIL Identity REST API.
// Uses the client_credentials grant against the realm's token endpoint, then
// calls the IDP Users API (getUserInfo / updateProfileUser).
//
// References:
//   https://developer.kobil.com/api/idp#tag/Users/operation/getUserInfo
//   https://developer.kobil.com/api/idp#tag/Users/operation/updateProfileUser

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

export async function getUserFromIdp(sub: string): Promise<KobilIdpUser | null> {
  const token = await getServiceToken();
  const e = env();
  const base = (e.KOBIL_IDP_USERS_API ?? `${e.KOBIL_IDP_ISSUER.replace(/\/$/, "")}/users`).replace(
    /\/$/,
    "",
  );
  const url = `${base}/${encodeURIComponent(sub)}`;

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
  if (res.status === 404) return null;
  if (!res.ok) {
    logEvent("warn", "kobil_get_user_failed", { status: res.status });
    throw new Error(`KOBIL getUserInfo returned ${res.status}`);
  }
  return (await res.json()) as KobilIdpUser;
}

export type KobilIdpUserPatch = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  attributes: Record<string, string[]>;
}>;

export async function updateUserInIdp(sub: string, patch: KobilIdpUserPatch): Promise<void> {
  const token = await getServiceToken();
  const e = env();
  const base = (e.KOBIL_IDP_USERS_API ?? `${e.KOBIL_IDP_ISSUER.replace(/\/$/, "")}/users`).replace(
    /\/$/,
    "",
  );
  const url = `${base}/${encodeURIComponent(sub)}`;

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
    logEvent("warn", "kobil_update_user_failed", { status: res.status, body: text.slice(0, 200) });
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
