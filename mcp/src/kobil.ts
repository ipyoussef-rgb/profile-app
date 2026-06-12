// Minimal, self-contained KOBIL Identity client for the MCP server.
// Mirrors the profile-app's verified v3_user flow (GET {issuer}/v3_user/{key},
// PUT {issuer}/v3_user/{key}/update) and adds Keycloak admin
// execute-actions-email for password / email changes.
//
// Auth: client_credentials with the KOBIL *service* client. That means this
// server acts with the service client's permissions (admin-ish), NOT on behalf
// of a specific logged-in end user. Guard it accordingly (see README).

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export type Env = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  usersBase: string;
  realm: string;
  adminBase: string;
  readOnly: boolean;
  allowedUsers: string[] | null;
};

export function loadEnv(): Env {
  const issuer = req("KOBIL_IDP_ISSUER").replace(/\/+$/, "");
  // issuer = {base}/realms/{realm}  →  admin base = {base}/admin/realms/{realm}
  const m = /^(.*)\/realms\/([^/]+)$/.exec(issuer);
  const realm = m ? m[2] : "";
  const adminBase = m ? `${m[1]}/admin/realms/${realm}` : "";
  const usersBase = (process.env.KOBIL_IDP_USERS_API ?? `${issuer}/v3_user`).replace(/\/+$/, "");
  const allowed = (process.env.MCP_ALLOWED_USERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return {
    issuer,
    clientId: req("KOBIL_SERVICE_CLIENT_ID"),
    clientSecret: req("KOBIL_SERVICE_CLIENT_SECRET"),
    usersBase,
    realm,
    adminBase,
    // SAFE DEFAULT: read-only unless explicitly disabled.
    readOnly: process.env.MCP_READONLY !== "0",
    allowedUsers: allowed.length ? allowed : null,
  };
}

let cached: { token: string; expiresAt: number } | null = null;

export async function getServiceToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 30 > now) return cached.token;
  const tokenUrl = `${env.issuer}/protocol/openid-connect/token`;
  const basic = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`KOBIL token endpoint returned ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cached = { token: json.access_token, expiresAt: now + (json.expires_in ?? 300) };
  return cached.token;
}

export type KobilUser = {
  id?: string;
  username?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[] | string | undefined>;
};

type Envelope = { message?: string; status?: string; data?: KobilUser };

export async function getUser(env: Env, userKey: string): Promise<KobilUser | null> {
  const token = await getServiceToken(env);
  const res = await fetch(`${env.usersBase}/${encodeURIComponent(userKey)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getUser returned ${res.status}: ${(await safeText(res)).slice(0, 200)}`);
  const raw = (await res.json()) as Envelope | KobilUser;
  return (raw as Envelope).data ?? (raw as KobilUser);
}

export type UpdatePatch = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  attributes: Record<string, string[]>;
}>;

export async function updateUser(env: Env, userKey: string, patch: UpdatePatch): Promise<void> {
  const token = await getServiceToken(env);
  const res = await fetch(`${env.usersBase}/${encodeURIComponent(userKey)}/update`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`updateUser returned ${res.status}: ${(await safeText(res)).slice(0, 200)}`);
}

/** Keycloak admin: email the user a link to run required actions (e.g.
 *  UPDATE_PASSWORD, UPDATE_EMAIL). Requires the service account to hold
 *  realm-management `manage-users`. `userId` MUST be the Keycloak UUID. */
export async function executeActionsEmail(
  env: Env,
  userId: string,
  actions: string[],
  opts: { redirectUri?: string; clientId?: string } = {},
): Promise<void> {
  if (!env.adminBase) throw new Error("Could not derive Keycloak admin base from KOBIL_IDP_ISSUER");
  const token = await getServiceToken(env);
  const qs = new URLSearchParams();
  if (opts.redirectUri) qs.set("redirect_uri", opts.redirectUri);
  if (opts.clientId) qs.set("client_id", opts.clientId);
  const url = `${env.adminBase}/users/${encodeURIComponent(userId)}/execute-actions-email${
    qs.toString() ? `?${qs}` : ""
  }`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(actions),
  });
  if (!res.ok) {
    throw new Error(
      `execute-actions-email returned ${res.status}: ${(await safeText(res)).slice(0, 200)}. ` +
        `The service client likely needs realm-management 'manage-users'.`,
    );
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** Form date YYYY-MM-DD → KOBIL's stored DD.MM.YYYY (matches the app). */
export function birthdateIsoToKobil(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

/** Enforce the optional allowlist before any mutation. */
export function assertAllowed(env: Env, userKey: string) {
  if (env.allowedUsers && !env.allowedUsers.includes(userKey.toLowerCase())) {
    throw new Error(
      `User "${userKey}" is not in MCP_ALLOWED_USERS — refusing the write. ` +
        `Add them to the allowlist or clear it to allow all.`,
    );
  }
}

export function assertWritable(env: Env) {
  if (env.readOnly) {
    throw new Error(
      "MCP server is read-only (MCP_READONLY is not '0'). Set MCP_READONLY=0 to enable writes.",
    );
  }
}
