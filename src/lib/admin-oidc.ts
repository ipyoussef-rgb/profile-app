import * as client from "openid-client";
import { env } from "./env";

let cached: client.Configuration | null = null;

export async function getAdminOidcConfig(): Promise<client.Configuration> {
  if (cached) return cached;
  const e = env();
  const clientId = e.KOBIL_ADMIN_CLIENT_ID;
  const clientSecret = e.KOBIL_ADMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Admin OIDC is not configured — set KOBIL_ADMIN_CLIENT_ID and KOBIL_ADMIN_CLIENT_SECRET.",
    );
  }
  cached = await client.discovery(new URL(e.KOBIL_IDP_ISSUER), clientId, clientSecret);
  return cached;
}

export function adminRedirectUri() {
  return `${env().APP_BASE_URL}/api/admin/auth/callback`;
}

export function adminPostLogoutRedirectUri() {
  return `${env().APP_BASE_URL}/`;
}
