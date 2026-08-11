import * as client from "openid-client";
import { env } from "./env";

let cached: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (cached) return cached;
  const e = env();
  cached = await client.discovery(
    new URL(e.KOBIL_IDP_ISSUER),
    e.KOBIL_MINIAPP_CLIENT_ID,
    e.KOBIL_MINIAPP_CLIENT_SECRET,
  );
  return cached;
}

// Strip any trailing slash so we never emit `https://host//api/...`, which
// would fail Keycloak's exact redirect-URI match.
function baseUrl() {
  return env().APP_BASE_URL.replace(/\/+$/, "");
}

export function redirectUri() {
  return `${baseUrl()}/api/auth/callback`;
}

export function postLogoutRedirectUri() {
  // Where the user lands after RP-initiated logout. Defaults to the app root;
  // override with OIDC_POST_LOGOUT_REDIRECT_URI (e.g. the KOBIL Super-App deep
  // link). Whatever value is used MUST be registered in the login client's
  // "Valid Post Logout Redirect URIs" in KOBIL Identity, or Keycloak rejects it.
  return env().OIDC_POST_LOGOUT_REDIRECT_URI || `${baseUrl()}/`;
}

// Exchange a (long-lived, offline_access) refresh token for a fresh access
// token using the confidential miniapp client. The headless change-email /
// change-password flow needs a CURRENTLY-VALID user token to hand to KOBIL's
// KobilCookieAuthenticator — a stale one makes it demand re-authentication and
// fail with invalid_user_credentials. Keycloak rotates refresh tokens, so the
// caller must persist the returned refresh_token if present.
export async function refreshAccessToken(
  refreshToken: string,
  extraHeaders?: Record<string, string>,
) {
  const config = await getOidcConfig();
  if (!extraHeaders || Object.keys(extraHeaders).length === 0) {
    return client.refreshTokenGrant(config, refreshToken);
  }
  // The token request is the one leg of the headless flow we make ourselves, so
  // it is the only place we can attach real request headers — the authorize step
  // is a browser redirect and a page cannot set headers on a navigation. KOBIL's
  // ASTTokenMapper runs while this token is being minted (that is the
  // `hasClientId` / `X-KOBIL-AST-LOGIN-REQUIRED` log pair), so this is where the
  // AST context has to arrive.
  //
  // A separate Configuration, not the cached one: customFetch lives on the
  // config object, and mutating the shared instance would leak these headers
  // into every other token call racing alongside this one.
  const e = env();
  const scoped = new client.Configuration(
    config.serverMetadata(),
    e.KOBIL_MINIAPP_CLIENT_ID,
    e.KOBIL_MINIAPP_CLIENT_SECRET,
  );
  scoped[client.customFetch] = (url, options) => {
    const headers = new Headers(options?.headers as HeadersInit | undefined);
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
    // openid-client types the body as Uint8Array, which is a valid BodyInit at
    // runtime but not in TS's RequestInit under this lib target — cast at the
    // boundary rather than reshaping a body we only pass straight through.
    return fetch(url, { ...options, headers } as RequestInit);
  };
  return client.refreshTokenGrant(scoped, refreshToken);
}
