import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getOidcConfig, postLogoutRedirectUri } from "@/lib/oidc";
import {
  KOBIL_AT_COOKIE,
  KOBIL_RT_COOKIE,
  SESSION_COOKIE,
  getSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// Expire the auth cookies ON the redirect response. Next.js 15 does NOT
// reliably ship Set-Cookie from next/headers cookies().delete() alongside a
// fresh NextResponse.redirect() — the same quirk login/callback work around by
// mutating response.cookies. Using clearSessionCookie() here was effectively a
// no-op, so profile_session survived logout and the stale (pre-offline_access)
// session kept passing requireUser(), which is why "log out and back in" never
// produced a refresh token. Clearing on the response itself actually deletes
// them in the browser.
function redirectClearingCookies(url: URL): NextResponse {
  const secure = env().APP_BASE_URL.startsWith("https://");
  const res = NextResponse.redirect(url);
  for (const name of [SESSION_COOKIE, KOBIL_AT_COOKIE, KOBIL_RT_COOKIE]) {
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
  // Next.js prefetches <Link> targets — without this guard a hover or
  // viewport-entry on the "Sign out" link silently destroys the session.
  if (req.headers.get("rsc") || req.headers.get("next-router-prefetch")) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getSession();
  const home = new URL("/", env().APP_BASE_URL);

  if (env().PROFILE_EMBED_MODE || !session) {
    return redirectClearingCookies(home);
  }

  const config = await getOidcConfig();
  try {
    const endSession = client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: postLogoutRedirectUri(),
    });
    return redirectClearingCookies(endSession);
  } catch {
    return redirectClearingCookies(home);
  }
}
