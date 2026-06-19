import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { decodeJwt } from "jose";
import { env } from "@/lib/env";
import { getOidcConfig, redirectUri } from "@/lib/oidc";
import {
  KOBIL_AT_COOKIE,
  KOBIL_RT_COOKIE,
  OIDC_STATE_COOKIE,
  SESSION_COOKIE,
  readOidcStateCookie,
  signSession,
} from "@/lib/session";

const USER_SESSION_TTL_SECONDS = 60 * 60 * 8;
import { describeError, logEvent } from "@/lib/safe-log";

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
      /* opaque token, ignore */
    }
  }
  const merged = new Set<string>();
  if (Array.isArray(fromId)) for (const r of fromId) merged.add(r);
  if (Array.isArray(fromAccess)) for (const r of fromAccess) merged.add(r);
  return merged.size > 0 ? Array.from(merged) : undefined;
}

export const dynamic = "force-dynamic";

function failOidc(reason: string, detail: Record<string, unknown> = {}, status = 400) {
  logEvent("warn", "oidc_callback_failed", { reason, ...detail });
  return new NextResponse(`OIDC callback failed: ${reason}`, { status });
}

export async function GET(req: NextRequest) {
  // Echo the raw query params the IdP sent so we can see whether KOBIL
  // returned a code (success) or an error= param (rejected before reaching us).
  const qpHasCode = req.nextUrl.searchParams.has("code");
  const qpError = req.nextUrl.searchParams.get("error");
  const qpErrorDescription = req.nextUrl.searchParams.get("error_description");
  if (qpError) {
    return failOidc("idp_error_in_query", {
      error: qpError,
      error_description: qpErrorDescription,
    });
  }
  if (!qpHasCode) {
    return failOidc("no_code_in_query", {
      params: Array.from(req.nextUrl.searchParams.keys()),
    });
  }

  const stateRaw = await readOidcStateCookie();
  // In embedded mode the superapp owns the implicit session; we only process
  // a callback that WE initiated (a kc_action self-service flow leaves a state
  // cookie). No state cookie + embed mode = an un-initiated hit → 404.
  if (env().PROFILE_EMBED_MODE && !stateRaw) {
    return new NextResponse("OIDC callback is disabled in embedded mode.", { status: 404 });
  }
  if (!stateRaw) {
    return failOidc("missing_state_cookie", {
      cookie_names: req.cookies.getAll().map((c) => c.name),
      app_base_url: env().APP_BASE_URL,
    });
  }
  let stateBag: { codeVerifier: string; state: string; nonce: string; returnTo: string };
  try {
    stateBag = JSON.parse(stateRaw);
  } catch {
    return failOidc("corrupt_state_cookie");
  }

  const config = await getOidcConfig();

  // openid-client v6 does `instanceof URL` on currentUrl. Next.js's
  // `req.nextUrl` is a NextURL subclass and fails the check across realms;
  // a fresh stdlib URL works.
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
    return failOidc("authorization_code_grant_failed", {
      ...detail,
      redirect_uri_sent: redirectUri(),
    });
  }

  // Decisive diagnostic: did the IdP actually return a refresh token for the
  // offline_access scope? If has_refresh_token is false here, the miniapp
  // client isn't granting offline_access and the headless flow can never mint
  // a fresh token. token_scope echoes what the IdP actually issued.
  logEvent("info", "oidc_tokens_received", {
    has_access_token: Boolean(tokens.access_token),
    has_refresh_token: Boolean((tokens as { refresh_token?: string }).refresh_token),
    token_scope: (tokens as { scope?: string }).scope ?? null,
    expires_in: (tokens as { expires_in?: number }).expires_in ?? null,
  });

  const claims = tokens.claims();
  if (!claims) {
    return failOidc("tokens_missing_claims");
  }

  const sub = claims.sub as string;
  const preferred_username = (claims["preferred_username"] as string | undefined) ?? undefined;
  const email = (claims["email"] as string | undefined) ?? undefined;
  const email_verified =
    typeof claims["email_verified"] === "boolean"
      ? (claims["email_verified"] as boolean)
      : undefined;
  const accessToken = tokens.access_token;
  if (!accessToken) {
    return failOidc("missing_access_token");
  }

  // Roles come from the access token; the token itself is NOT persisted.
  const roles = extractRoles(claims as Record<string, unknown>, accessToken);

  const session = await signSession({
    sub,
    preferred_username,
    email,
    email_verified,
    roles,
  });

  const returnTo =
    stateBag.returnTo && stateBag.returnTo.startsWith("/") ? stateBag.returnTo : "/profile";

  // Set cookies directly on the redirect response (see admin callback for the
  // Next.js 15 quirk this avoids).
  const response = NextResponse.redirect(new URL(returnTo, env().APP_BASE_URL));
  response.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  });
  // Persist the KOBIL access token in its own httpOnly cookie so the headless
  // change-email/password flow can hand it to KobilCookieAuthenticator. Lives
  // as long as the token itself (falls back to the session TTL if unknown).
  const atMaxAge =
    typeof (tokens as { expires_in?: number }).expires_in === "number"
      ? (tokens as { expires_in?: number }).expires_in!
      : USER_SESSION_TTL_SECONDS;
  response.cookies.set(KOBIL_AT_COOKIE, accessToken, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: atMaxAge,
  });
  // Persist the refresh token (from offline_access) for the whole session
  // lifetime. The headless change-email/password flow refreshes it on demand
  // to obtain a currently-valid access token, since the AT cookie above
  // expires within minutes.
  const refreshToken = (tokens as { refresh_token?: string }).refresh_token;
  if (refreshToken) {
    response.cookies.set(KOBIL_RT_COOKIE, refreshToken, {
      httpOnly: true,
      secure: env().APP_BASE_URL.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: USER_SESSION_TTL_SECONDS,
    });
  }
  response.cookies.delete(OIDC_STATE_COOKIE);
  return response;
}
