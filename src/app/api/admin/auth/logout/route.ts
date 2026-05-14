import { NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminPostLogoutRedirectUri } from "@/lib/admin-oidc";
import { clearAdminSessionCookie, getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  await clearAdminSessionCookie();

  if (!session) {
    return NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  }

  try {
    const config = await getAdminOidcConfig();
    const endSession = client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: adminPostLogoutRedirectUri(),
    });
    return NextResponse.redirect(endSession);
  } catch {
    return NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  }
}
