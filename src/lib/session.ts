import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const SESSION_COOKIE = "profile_session";
export const OIDC_STATE_COOKIE = "profile_oidc_state";
// KOBIL access token, kept in its own httpOnly cookie (NOT inside the session
// JWT, to avoid bloating it past the 4KB cookie limit). Used to hand the
// user's token to KOBIL's headless change-email/password clients, whose
// KobilCookieAuthenticator reads it under key_name=Authorization.
export const KOBIL_AT_COOKIE = "profile_kobil_at";
// KOBIL refresh token (issued when login requests the offline_access scope).
// Long-lived, httpOnly. The headless change-email/password flow exchanges it
// for a FRESH access token at action time, because the access token cookie
// expires within minutes (its own short TTL) while the session lives for
// hours — without this, the token is gone by the time the user acts and
// KobilCookieAuthenticator rejects the stale credentials.
export const KOBIL_RT_COOKIE = "profile_kobil_rt";

// 30 minutes, deliberately NOT hours. This JWT is self-signed and never
// re-checked against the IDP, so its lifetime IS the window in which a logout in
// the Super App goes unnoticed here: the mini-app would keep letting the user in
// while every KOBIL call fails. Kept short so that window closes quickly, and
// long enough that the silent re-login (the IDP still has its SSO cookie, so the
// authorize round-trip needs no interaction) stays rare. Validating per request
// instead would cost a token call on every page view — this costs none.
const SESSION_TTL_SECONDS = 60 * 30;

export type SessionPayload = {
  sub: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  roles?: string[];
};

function key() {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return await verifySession(raw);
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Every cookie this app owns. Anything that resets auth MUST clear all of
 *  them — a leftover `profile_oidc_state` is what made a failed callback stick
 *  across app restarts (cookies survive in the WebView cookie jar). */
export const ALL_AUTH_COOKIES = [
  SESSION_COOKIE,
  OIDC_STATE_COOKIE,
  KOBIL_AT_COOKIE,
  KOBIL_RT_COOKIE,
] as const;

/** Expire all auth cookies ON the given response. Next.js 15 does not reliably
 *  ship Set-Cookie from next/headers alongside a fresh NextResponse, so callers
 *  must mutate the response they return — see the note in the logout route. */
export function clearAuthCookiesOn<T extends NextResponse>(res: T, secure: boolean): T {
  for (const name of ALL_AUTH_COOKIES) {
    res.cookies.set({ name, value: "", httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  c.delete(KOBIL_AT_COOKIE);
  c.delete(KOBIL_RT_COOKIE);
}

export async function setOidcStateCookie(value: string) {
  const c = await cookies();
  c.set(OIDC_STATE_COOKIE, value, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });
}

export async function readOidcStateCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(OIDC_STATE_COOKIE)?.value;
}

export async function clearOidcStateCookie() {
  const c = await cookies();
  c.delete(OIDC_STATE_COOKIE);
}

export async function getKobilAccessToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(KOBIL_AT_COOKIE)?.value;
}

export async function getKobilRefreshToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(KOBIL_RT_COOKIE)?.value;
}
