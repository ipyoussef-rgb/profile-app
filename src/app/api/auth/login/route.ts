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

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  // Pack PKCE verifier + state + returnTo into the state cookie (signed-by-server
  // via JSON in an HttpOnly cookie; integrity is sufficient here since we also
  // validate the `state` echoed back by the IdP).
  await setOidcStateCookie(
    JSON.stringify({ codeVerifier, state, nonce, returnTo }),
  );

  const authUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  return NextResponse.redirect(authUrl);
}
