import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getOidcConfig, redirectUri } from "@/lib/oidc";
import { OIDC_STATE_COOKIE } from "@/lib/session";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  // In embedded mode the superapp host provides the implicit session, so the
  // miniapp must NOT start its own login. BUT the explicit self-service
  // actions (change email / phone / password) genuinely require a redirect to
  // Keycloak via kc_action — without this exception those buttons 404 inside
  // the super-app. Allow kc_action round-trips; block plain logins only.
  if (env().PROFILE_EMBED_MODE && !kc_action) {
    return new NextResponse("OIDC login is disabled in embedded mode.", { status: 404 });
  }

  const config = await getOidcConfig();

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

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

  // Log the EXACT redirect_uri we send so it can be copy-pasted into the
  // Keycloak client's "Valid redirect URIs". A mismatch here is the most
  // common cause of the IdP rejecting the flow before the callback runs.
  logEvent("info", "oidc_login_start", {
    redirect_uri: authParams.redirect_uri,
    authorization_endpoint: authUrl.origin + authUrl.pathname,
    client_id: env().KOBIL_MINIAPP_CLIENT_ID,
    kc_action: kc_action ?? null,
    returnTo,
    app_base_url: env().APP_BASE_URL,
  });

  // Attach the state cookie directly to the redirect response — Next.js 15's
  // cookies().set() from next/headers doesn't reliably ship Set-Cookie
  // alongside a fresh NextResponse.redirect(), which causes
  // `missing_state_cookie` on the way back from the IdP.
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    OIDC_STATE_COOKIE,
    JSON.stringify({ codeVerifier, state, nonce, returnTo }),
    {
      httpOnly: true,
      secure: env().APP_BASE_URL.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    },
  );
  return response;
}
