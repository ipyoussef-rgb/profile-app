import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const SESSION_COOKIE = "profile_session";
export const OIDC_STATE_COOKIE = "profile_oidc_state";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

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

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
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
