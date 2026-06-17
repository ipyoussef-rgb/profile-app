import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
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

  const base = env().APP_BASE_URL.replace(/\/+$/, "");
  // Landing page after the action. Must be a Valid Redirect URI on the
  // headless client. No query string → exact-match friendly in Keycloak.
  const redirectUri = `${base}/profile`;
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
    // Force a fresh authentication every time. Without this the first call
    // works (fresh login) but later calls reuse the existing KOBIL SSO
    // session, and the action's re-auth step against that stale session
    // fails with "Invalid user credentials". prompt=login + max_age=0 make
    // every attempt behave like the first.
    prompt: "login",
    max_age: "0",
  });
  if (user.email) params.set("login_hint", user.email);

  const url = `${authEndpoint}?${params.toString()}`;
  logEvent("info", "idp_action_start", {
    action: actionParam,
    client_id: cfg.clientId,
    kc_action: cfg.kcAction,
    redirect_uri: redirectUri,
  });
  return NextResponse.redirect(url);
}
