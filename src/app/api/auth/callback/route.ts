import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getOidcConfig, redirectUri } from "@/lib/oidc";
import {
  clearOidcStateCookie,
  readOidcStateCookie,
  setSessionCookie,
  signSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (env().PROFILE_EMBED_MODE) {
    return new NextResponse("OIDC callback is disabled in embedded mode.", { status: 404 });
  }

  const stateRaw = await readOidcStateCookie();
  if (!stateRaw) {
    return new NextResponse("Missing OIDC state cookie. Please sign in again.", { status: 400 });
  }
  let stateBag: { codeVerifier: string; state: string; nonce: string; returnTo: string };
  try {
    stateBag = JSON.parse(stateRaw);
  } catch {
    return new NextResponse("Corrupt OIDC state cookie.", { status: 400 });
  }

  const config = await getOidcConfig();

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
  try {
    tokens = await client.authorizationCodeGrant(config, req.nextUrl, {
      pkceCodeVerifier: stateBag.codeVerifier,
      expectedState: stateBag.state,
      expectedNonce: stateBag.nonce,
    });
  } catch (e) {
    return new NextResponse(
      `OIDC authorization failed: ${e instanceof Error ? e.message : "unknown error"}`,
      { status: 400 },
    );
  }

  const claims = tokens.claims();
  if (!claims) {
    return new NextResponse("OIDC tokens missing claims.", { status: 400 });
  }

  const sub = claims.sub as string;
  const preferred_username = (claims["preferred_username"] as string | undefined) ?? undefined;
  const email = (claims["email"] as string | undefined) ?? undefined;
  const email_verified =
    typeof claims["email_verified"] === "boolean"
      ? (claims["email_verified"] as boolean)
      : undefined;
  const rawRoles = (claims["realm_access"] as { roles?: string[] } | undefined)?.roles;
  const roles = Array.isArray(rawRoles) ? rawRoles : undefined;

  const accessToken = tokens.access_token;
  if (!accessToken) {
    return new NextResponse("OIDC response missing access_token.", { status: 400 });
  }

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
