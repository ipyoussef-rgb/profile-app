import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSession, SessionPayload } from "./session";

export class UnauthorizedError extends Error {
  // "no_cookie"      → browser didn't send profile_session at all
  // "invalid_session" → cookie was sent but JWT verification failed (likely
  //                     AUTH_SECRET rotated between deploys, or expired)
  constructor(public reason: "no_cookie" | "invalid_session" = "no_cookie") {
    super(`unauthorized:${reason}`);
  }
}

export async function requireUser(): Promise<SessionPayload> {
  const c = await cookies();
  const hasCookie = Boolean(c.get(SESSION_COOKIE)?.value);
  const s = await getSession();
  if (!s?.sub) {
    throw new UnauthorizedError(hasCookie ? "invalid_session" : "no_cookie");
  }
  return s;
}

export async function requireUserOrRedirect(returnTo = "/profile"): Promise<SessionPayload> {
  const s = await getSession();
  if (!s?.sub) redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return s;
}
