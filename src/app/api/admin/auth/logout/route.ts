import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminPostLogoutRedirectUri } from "@/lib/admin-oidc";
import { clearAdminSessionCookie, getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Next.js may prefetch the "Sign out" <Link> when it scrolls into view or
  // on hover. Those prefetches carry `RSC: 1` / `Next-Router-Prefetch: 1`;
  // treating them as real logouts silently destroys the admin session before
  // the user has done anything. Bail out without touching cookies.
  if (req.headers.get("rsc") || req.headers.get("next-router-prefetch")) {
    return new NextResponse(null, { status: 204 });
  }

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
