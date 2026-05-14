import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getOidcConfig, redirectUri } from "@/lib/oidc";
import { setOidcStateCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (env().PROFILE_EMBED_MODE) {
    // In embedded mode the superapp host provides the session; the miniapp
    // must not initiate its own OIDC flow.
    return new NextResponse("OIDC login is disabled in embedded mode.", { status: 404 });
  }

  const config = await getOidcConfig();
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/profile";
  // KOBIL Identity (Keycloak) supports the `kc_action` query parameter to run
  // a Required Action during the auth flow — e.g. UPDATE_EMAIL prompts the
  // user for a new email and verifies it via a confirmation link. We pass
  // it straight through to the IdP so the realm config decides how the
  // verification is performed (which authenticator, what proof, etc.).
  // Allowlist of supported actions, expanded as the realm exposes more.
  const requestedAction = req.nextUrl.searchParams.get("kc_action");
  const ACTION_ALLOWLIST = new Set([
    "UPDATE_EMAIL",
    "UPDATE_PASSWORD",
    "UPDATE_PROFILE",
    "VERIFY_EMAIL",
    "CONFIGURE_TOTP",
    "UPDATE_PHONE_NUMBER", // KOBIL custom required action; falls back to no-op if not configured
    "VERIFY_PHONE_NUMBER",
  ]);
  const kc_action =
    requestedAction && ACTION_ALLOWLIST.has(requestedAction) ? requestedAction : undefined;

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  await setOidcStateCookie(
    JSON.stringify({ codeVerifier, state, nonce, returnTo }),
  );

  const authParams: Record<string, string> = {
    redirect_uri: redirectUri(),
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  };
  if (kc_action) {
    authParams.kc_action = kc_action;
  }

  const authUrl = client.buildAuthorizationUrl(config, authParams);
  return NextResponse.redirect(authUrl);
}
