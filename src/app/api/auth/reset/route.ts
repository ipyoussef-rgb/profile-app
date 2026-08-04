import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearAuthCookiesOn } from "@/lib/session";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

/** Escape hatch: wipe every cookie this app owns and start over.
 *
 *  Cookies live in the Super App's WebView cookie jar, so a broken auth state
 *  used to survive killing the app and signing in again — there was no way out
 *  from inside the WebView. Opening this route always yields a clean slate;
 *  landing on `/` then begins a fresh login. Also handy for support: "open
 *  <app>/api/auth/reset".
 *
 *  Safe to expose: it only ever DELETES the caller's own cookies. */
export async function GET(req: NextRequest) {
  // Next.js prefetches <Link> targets; a prefetch must not silently sign the
  // user out. Same guard the logout route uses.
  if (req.headers.get("rsc") || req.headers.get("next-router-prefetch")) {
    return new NextResponse(null, { status: 204 });
  }
  logEvent("info", "auth_reset");
  const res = NextResponse.redirect(new URL("/", env().APP_BASE_URL));
  clearAuthCookiesOn(res, env().APP_BASE_URL.startsWith("https://"));
  // Also drop the callback's retry marker so the next failure gets its own
  // silent retry rather than jumping straight to the error page.
  res.cookies.set({
    name: "profile_auth_retry",
    value: "",
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
