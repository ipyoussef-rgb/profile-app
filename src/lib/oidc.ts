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
export async function refreshAccessToken(refreshToken: string) {
  const config = await getOidcConfig();
  return client.refreshTokenGrant(config, refreshToken);
}
