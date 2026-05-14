import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { decodeJwt } from "jose";
import { env } from "@/lib/env";
import { getOidcConfig, redirectUri } from "@/lib/oidc";
import {
  clearOidcStateCookie,
  readOidcStateCookie,
  setSessionCookie,
  signSession,
} from "@/lib/session";
import { logEvent } from "@/lib/safe-log";

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
  if (env().PROFILE_EMBED_MODE) {
    return new NextResponse("OIDC callback is disabled in embedded mode.", { status: 404 });
  }

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
    return failOidc("authorization_code_grant_failed", {
      message: e instanceof Error ? e.message : String(e),
      redirect_uri_sent: redirectUri(),
    });
  }

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

  const roles = extractRoles(claims as Record<string, unknown>, accessToken);

  const session = await signSession({
    sub,
    preferred_username,
    email,
    email_verified,
    roles,
    access_token: accessToken,
    at_exp: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : undefined,
  });

  await setSessionCookie(session);
  await clearOidcStateCookie();

  const returnTo =
    stateBag.returnTo && stateBag.returnTo.startsWith("/") ? stateBag.returnTo : "/profile";
  return NextResponse.redirect(new URL(returnTo, env().APP_BASE_URL));
}
