import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminRedirectUri } from "@/lib/admin-oidc";
import {
  clearAdminOidcStateCookie,
  readAdminOidcStateCookie,
  setAdminSessionCookie,
  signAdminSession,
} from "@/lib/admin-session";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

function fail(reason: string, detail: Record<string, unknown> = {}, status = 400) {
  logEvent("warn", "admin_oidc_callback_failed", { reason, ...detail });
  return new NextResponse(`Admin OIDC callback failed: ${reason}`, { status });
}

export async function GET(req: NextRequest) {
  if (env().PROFILE_EMBED_MODE) {
    return new NextResponse("Admin OIDC callback is disabled in embedded mode.", { status: 404 });
  }

  const qpHasCode = req.nextUrl.searchParams.has("code");
  const qpError = req.nextUrl.searchParams.get("error");
  if (qpError) {
    return fail("idp_error_in_query", {
      error: qpError,
      error_description: req.nextUrl.searchParams.get("error_description"),
    });
  }
  if (!qpHasCode) {
    return fail("no_code_in_query");
  }

  const stateRaw = await readAdminOidcStateCookie();
  if (!stateRaw) return fail("missing_state_cookie", { app_base_url: env().APP_BASE_URL });
  let stateBag: { codeVerifier: string; state: string; nonce: string; returnTo: string };
  try {
    stateBag = JSON.parse(stateRaw);
  } catch {
    return fail("corrupt_state_cookie");
  }

  const config = await getAdminOidcConfig();
  const currentUrl = new URL(req.url);

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
  try {
    tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: stateBag.codeVerifier,
      expectedState: stateBag.state,
      expectedNonce: stateBag.nonce,
    });
  } catch (e) {
    return fail("authorization_code_grant_failed", {
      message: e instanceof Error ? e.message : String(e),
      redirect_uri_sent: adminRedirectUri(),
    });
  }

  const claims = tokens.claims();
  if (!claims) return fail("tokens_missing_claims");

  const sub = claims.sub as string;
  const preferred_username = (claims["preferred_username"] as string | undefined) ?? undefined;
  const email = (claims["email"] as string | undefined) ?? undefined;
  const rawRoles = (claims["realm_access"] as { roles?: string[] } | undefined)?.roles;
  const roles = Array.isArray(rawRoles) ? rawRoles : undefined;

  const accessToken = tokens.access_token;
  if (!accessToken) return fail("missing_access_token");

  const session = await signAdminSession({
    sub,
    preferred_username,
    email,
    roles,
    access_token: accessToken,
    at_exp: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
  });

  await setAdminSessionCookie(session);
  await clearAdminOidcStateCookie();

  // If the admin role is missing, log them in but route to /admin/forbidden so they
  // get a clear message rather than a silent redirect loop.
  const requiredRole = env().KOBIL_ADMIN_ROLE;
  const hasRole = roles?.includes(requiredRole) ?? false;
  const returnTo = hasRole
    ? stateBag.returnTo && stateBag.returnTo.startsWith("/admin")
      ? stateBag.returnTo
      : "/admin"
    : "/admin/forbidden";

  return NextResponse.redirect(new URL(returnTo, env().APP_BASE_URL));
}
