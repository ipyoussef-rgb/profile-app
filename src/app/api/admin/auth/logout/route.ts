import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminPostLogoutRedirectUri } from "@/lib/admin-oidc";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_OIDC_STATE_COOKIE,
  getAdminSession,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

// Expire the admin cookies ON the redirect response — next/headers
// cookies().delete() does not reliably ship Set-Cookie alongside a fresh
// NextResponse.redirect() in Next.js 15, so clearAdminSessionCookie() left the
// admin session in place. Clear on the response itself.
function redirectClearingCookies(url: URL): NextResponse {
  const secure = env().APP_BASE_URL.startsWith("https://");
  const res = NextResponse.redirect(url);
  for (const name of [ADMIN_SESSION_COOKIE, ADMIN_OIDC_STATE_COOKIE]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}

export async function GET(req: NextRequest) {
  // Next.js may prefetch the "Sign out" <Link> when it scrolls into view or
  // on hover. Those prefetches carry `RSC: 1` / `Next-Router-Prefetch: 1`;
  // treating them as real logouts silently destroys the admin session before
  // the user has done anything. Bail out without touching cookies.
  if (req.headers.get("rsc") || req.headers.get("next-router-prefetch")) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getAdminSession();
  const home = new URL("/", env().APP_BASE_URL);

  if (!session) {
    return redirectClearingCookies(home);
  }

  try {
    const config = await getAdminOidcConfig();
    const endSession = client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: adminPostLogoutRedirectUri(),
    });
    return redirectClearingCookies(endSession);
  } catch {
    return redirectClearingCookies(home);
  }
}
