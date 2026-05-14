import { NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { env } from "@/lib/env";
import { getAdminOidcConfig, adminRedirectUri } from "@/lib/admin-oidc";
import { setAdminOidcStateCookie } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (env().PROFILE_EMBED_MODE) {
    return new NextResponse("Admin OIDC is disabled in embedded mode.", { status: 404 });
  }

  const config = await getAdminOidcConfig();
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/admin";

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  await setAdminOidcStateCookie(JSON.stringify({ codeVerifier, state, nonce, returnTo }));

  const authUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: adminRedirectUri(),
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  return NextResponse.redirect(authUrl);
}
