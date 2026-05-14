import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { decodeJwt } from "jose";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminRedirectUri } from "@/lib/admin-oidc";
import {
  ADMIN_OIDC_STATE_COOKIE,
  ADMIN_SESSION_COOKIE,
  readAdminOidcStateCookie,
  signAdminSession,
} from "@/lib/admin-session";
import { describeError, logEvent } from "@/lib/safe-log";

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 4;

// Keycloak puts realm_access.roles in the access token by default but NOT in
// the ID token unless the client has the matching mapper enabled. Read both
// and take the union so role gating works regardless of mapper config.
function extractRoles(
  idClaims: Record<string, unknown> | undefined,
  accessToken: string | undefined,
): string[] | undefined {
  const fromId = (idClaims?.["realm_access"] as { roles?: string[] } | undefined)?.roles;
  let fromAccess: string[] | undefined;
  if (accessToken) {
    try {
      const payload = decodeJwt(accessToken) as Record<string, unknown>;
      fromAccess = (payload["realm_access"] as { roles?: string[] } | undefined)?.roles;
    } catch {
      // Access token isn't a JWT (e.g. opaque) — fall back to id token only.
    }
  }
  const merged = new Set<string>();
  if (Array.isArray(fromId)) for (const r of fromId) merged.add(r);
  if (Array.isArray(fromAccess)) for (const r of fromAccess) merged.add(r);
  return merged.size > 0 ? Array.from(merged) : undefined;
}

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
    const detail = await describeError(e);
    return fail("authorization_code_grant_failed", {
      ...detail,
      redirect_uri_sent: adminRedirectUri(),
    });
  }

  const claims = tokens.claims();
  if (!claims) return fail("tokens_missing_claims");

  const sub = claims.sub as string;
  const preferred_username = (claims["preferred_username"] as string | undefined) ?? undefined;
  const email = (claims["email"] as string | undefined) ?? undefined;

  const accessToken = tokens.access_token;
  if (!accessToken) return fail("missing_access_token");

  const roles = extractRoles(claims as Record<string, unknown>, accessToken);
  // Telemetry — visible in Vercel runtime logs, helps debugging role gating.
  logEvent("info", "admin_oidc_callback_ok", {
    sub,
    role_count: roles?.length ?? 0,
    has_admin_role: roles?.includes(env().KOBIL_ADMIN_ROLE) ?? false,
  });

  const session = await signAdminSession({
    sub,
    preferred_username,
    email,
    roles,
    access_token: accessToken,
    at_exp: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
  });

  const requiredRole = env().KOBIL_ADMIN_ROLE;
  const hasRole = roles?.includes(requiredRole) ?? false;
  const target = hasRole
    ? stateBag.returnTo && stateBag.returnTo.startsWith("/admin")
      ? stateBag.returnTo
      : "/admin"
    : "/access-denied";

  // CRITICAL: attach cookies directly to the redirect Response. In Next.js 15,
  // cookies set via `cookies().set()` from next/headers don't always survive
  // when the handler returns a fresh NextResponse — the redirect goes out
  // without the Set-Cookie, and the next request loops back through the OIDC
  // flow because the role gate finds no session.
  const response = NextResponse.redirect(new URL(target, env().APP_BASE_URL));
  response.cookies.set(ADMIN_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  response.cookies.delete(ADMIN_OIDC_STATE_COOKIE);
  return response;
}
