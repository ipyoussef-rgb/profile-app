import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { getKobilAccessToken } from "@/lib/session";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

// KOBIL ships dedicated "headless" OIDC clients that each run one self-service
// required action and redirect back. These are hardcoded on purpose — they're
// fixed per the KOBIL tenant, not per-deployment config.
const ACTIONS = {
  email: { clientId: "IDPChangeEmailHeadlessV2", kcAction: "UPDATE_EMAIL" },
  password: { clientId: "IDPChangePasswordHeadlessV2", kcAction: "UPDATE_PASSWORD" },
} as const;

// The Valid Redirect URI registered on both headless clients
// (IDPChangeEmailHeadlessV2 / IDPChangePasswordHeadlessV2). This is the KOBIL
// Super-App sentinel: it never loads in a browser — the native WebView shell
// intercepts the navigation to `https://kobil/...` and ends the flow. It MUST
// match the client's registered redirect URI exactly or Keycloak rejects the
// request with invalid_redirect_uri. We never exchange the code (the required
// action's side effect is the whole point), so the URL only has to validate,
// not resolve. Hardcoded — fixed per the KOBIL tenant, like the client IDs.
const KOBIL_HEADLESS_REDIRECT_URI = "https://kobil/OpenIdRedirectUri";

type ActionKey = keyof typeof ACTIONS;

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      const base = env().APP_BASE_URL.replace(/\/+$/, "");
      return NextResponse.redirect(`${base}/api/auth/login?returnTo=%2Fprofile%2Fedit`);
    }
    throw e;
  }

  const actionParam = req.nextUrl.searchParams.get("action") as ActionKey | null;
  const cfg = actionParam && actionParam in ACTIONS ? ACTIONS[actionParam] : null;
  if (!cfg) {
    return new NextResponse("unknown action (expected ?action=email|password)", { status: 400 });
  }

  // Must be the Valid Redirect URI registered on the headless client (the
  // KOBIL Super-App sentinel), not the app's own URL — Keycloak exact-matches
  // it. No query string → exact-match friendly.
  const redirectUri = KOBIL_HEADLESS_REDIRECT_URI;
  const authEndpoint = `${env().KOBIL_IDP_ISSUER.replace(/\/+$/, "")}/protocol/openid-connect/auth`;

  // These clients may require PKCE. We never exchange the resulting code (the
  // action's side effect is all we need), but sending a valid challenge keeps
  // PKCE-enforcing clients happy.
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    scope: "openid",
    redirect_uri: redirectUri,
    kc_action: cfg.kcAction,
    state: randomUUID(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    // NOTE: do NOT send prompt=login / max_age=0 here. KOBIL authenticates
    // these headless flows with KobilCookieAuthenticator (a silent
    // Authorization-cookie SSO). Forcing re-auth makes it log
    // "Re-authentication is required" and fail with invalid_user_credentials
    // on every call. Let the cookie authenticator run silently.
  });
  if (user.email) params.set("login_hint", user.email);

  // Hand the user's KOBIL access token to the headless client's
  // KobilCookieAuthenticator (reads key_name=Authorization). Passing a fresh
  // token from the session is what lets repeat calls re-authenticate instead
  // of failing with "Re-authentication is required".
  const accessToken = await getKobilAccessToken();
  if (accessToken) params.set("Authorization", accessToken);

  const url = `${authEndpoint}?${params.toString()}`;
  logEvent("info", "idp_action_start", {
    action: actionParam,
    client_id: cfg.clientId,
    kc_action: cfg.kcAction,
    redirect_uri: redirectUri,
    has_token: Boolean(accessToken),
  });
  return NextResponse.redirect(url);
}
