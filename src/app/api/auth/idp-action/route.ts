import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import {
  KOBIL_AT_COOKIE,
  KOBIL_RT_COOKIE,
  getKobilAccessToken,
  getKobilRefreshToken,
} from "@/lib/session";
import { refreshAccessToken } from "@/lib/oidc";
import { env, astClientIdKeys } from "@/lib/env";
import { getUserFromIdp } from "@/lib/kobil-idp";
import { newestAstClientId } from "@/lib/kobil-ast";
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

  // KOBIL's ASTTokenMapper logs `hasClientId: null` and
  // `X-KOBIL-AST-LOGIN-REQUIRED ... false` on this flow, and its
  // KobilCookieAuthenticator then reports "Re-authentication is required for
  // user" — the token it gets carries no AST client binding. The linked AST
  // clients are only discoverable through getUserInfo, and only in the attribute
  // KEYS (AST_CLIENT_ID_<id>_LINKED_TIMESTAMP), so resolve the newest one here
  // and hand it to both legs of the flow. Best-effort: if the lookup fails, or
  // the service client is not configured, the flow proceeds exactly as before.
  //
  // Which channel can actually deliver it, established from the IDP logs:
  //  - Query parameter on the authorize redirect: NO. Verified on 2026-08-11 —
  //    the parameter was present and ASTGeneralHelper still logged
  //    `X-KOBIL-ASTCLIENTID: null`, so it does not read query parameters. Kept
  //    anyway because it costs nothing and a future version may.
  //  - Header on the authorize redirect: IMPOSSIBLE. That leg is a browser
  //    navigation and a page cannot set headers on one. Only the Super-App
  //    WebView can, which is how `Authorization` gets there.
  //  - Header on THIS token refresh: YES, it is our own request — and
  //    ASTTokenMapper runs while the token is minted. If the mapper stamps the id
  //    into the token, KobilCookieAuthenticator can put it into the auth session,
  //    which is the third place ASTGeneralHelper looks. That chain is the point.
  const astHeaders: Record<string, string> = {};
  let astClientId: string | null = null;
  const astKeys = astClientIdKeys();
  const serviceClientReady = Boolean(
    env().KOBIL_SERVICE_CLIENT_ID && env().KOBIL_SERVICE_CLIENT_SECRET,
  );
  if (astKeys.length > 0 && serviceClientReady && user.email) {
    try {
      const idpUser = await getUserFromIdp(user.email);
      astClientId = idpUser ? newestAstClientId(idpUser) : null;
    } catch (e) {
      logEvent("warn", "idp_action_ast_lookup_failed", {
        action: actionParam,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  if (astClientId) {
    for (const key of astKeys) {
      astHeaders[key] = astClientId;
      params.set(key, astClientId);
    }
    if (env().KOBIL_AST_LOGIN_REQUIRED) {
      astHeaders["X-KOBIL-AST-LOGIN-REQUIRED"] = "true";
      params.set("X-KOBIL-AST-LOGIN-REQUIRED", "true");
    }
  }

  // The headless client's KobilCookieAuthenticator (reads key_name=Authorization)
  // needs a CURRENTLY-VALID user token. The access-token cookie expires within
  // minutes, so prefer minting a fresh token from the refresh token
  // (offline_access); a stale token makes the authenticator demand re-auth and
  // fail with invalid_user_credentials. Fall back to the cached access token.
  let accessToken = await getKobilAccessToken();
  let tokenSource: "refresh" | "cookie" | "none" = accessToken ? "cookie" : "none";
  let rotatedRefreshToken: string | undefined;
  let freshAtMaxAge: number | undefined;
  let didRefresh = false;

  const refreshToken = await getKobilRefreshToken();
  if (refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken, astHeaders);
      if (tokens.access_token) {
        accessToken = tokens.access_token;
        tokenSource = "refresh";
        didRefresh = true;
        // Keycloak rotates refresh tokens; capture the new one to persist.
        rotatedRefreshToken = (tokens as { refresh_token?: string }).refresh_token;
        freshAtMaxAge = typeof tokens.expires_in === "number" ? tokens.expires_in : undefined;
      }
    } catch (e) {
      logEvent("warn", "idp_action_refresh_failed", {
        action: actionParam,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (accessToken) params.set("Authorization", accessToken);

  const url = `${authEndpoint}?${params.toString()}`;
  logEvent("info", "idp_action_start", {
    action: actionParam,
    client_id: cfg.clientId,
    kc_action: cfg.kcAction,
    redirect_uri: redirectUri,
    has_token: Boolean(accessToken),
    token_source: tokenSource,
    // Match this against the IDP's ASTTokenMapper line: `hasClientId: null` with
    // ast_client_id_sent=true means KOBIL reads the id from somewhere other than
    // KOBIL_AST_CLIENT_ID_KEY, and the key needs correcting (chart value, no
    // rebuild). Only a prefix is logged — the full id identifies a device.
    ast_client_id_sent: Boolean(astClientId),
    ast_client_id_head: astClientId ? astClientId.slice(0, 6) : null,
    ast_keys: astKeys,
    ast_login_required: env().KOBIL_AST_LOGIN_REQUIRED,
  });

  const response = NextResponse.redirect(url);
  // Persist the rotated tokens on the redirect so a follow-up action can
  // refresh again (the consumed refresh token is invalidated by Keycloak).
  const secure = env().APP_BASE_URL.startsWith("https://");
  if (didRefresh) {
    response.cookies.set(KOBIL_AT_COOKIE, accessToken!, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: freshAtMaxAge,
    });
    if (rotatedRefreshToken) {
      response.cookies.set(KOBIL_RT_COOKIE, rotatedRefreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // align with the 8h session lifetime
      });
    }
  }
  return response;
}
