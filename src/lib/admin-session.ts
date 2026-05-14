import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const ADMIN_SESSION_COOKIE = "profile_admin_session";
export const ADMIN_OIDC_STATE_COOKIE = "profile_admin_oidc_state";

const SESSION_TTL_SECONDS = 60 * 60 * 4; // 4h — admin sessions shorter than user

export type AdminSessionPayload = {
  sub: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
};

function key() {
  // Use a salted variant of AUTH_SECRET so admin and user sessions can't be
  // swapped if one leaks. (Different signing key → different cookies.)
  return new TextEncoder().encode(`admin:${env().AUTH_SECRET}`);
}

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyAdminSession(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const c = await cookies();
  const raw = c.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return await verifyAdminSession(raw);
}

export async function setAdminSessionCookie(token: string) {
  const c = await cookies();
  c.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const c = await cookies();
  c.delete(ADMIN_SESSION_COOKIE);
}

export async function setAdminOidcStateCookie(value: string) {
  const c = await cookies();
  c.set(ADMIN_OIDC_STATE_COOKIE, value, {
    httpOnly: true,
    secure: env().APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function readAdminOidcStateCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(ADMIN_OIDC_STATE_COOKIE)?.value;
}

export async function clearAdminOidcStateCookie() {
  const c = await cookies();
  c.delete(ADMIN_OIDC_STATE_COOKIE);
}
