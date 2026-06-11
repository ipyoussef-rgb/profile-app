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
  return `${baseUrl()}/`;
}
