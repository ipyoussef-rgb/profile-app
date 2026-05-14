import { redirect } from "next/navigation";
import { getSession, SessionPayload } from "./session";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s?.sub) throw new UnauthorizedError();
  return s;
}

export async function requireUserOrRedirect(returnTo = "/profile"): Promise<SessionPayload> {
  const s = await getSession();
  if (!s?.sub) redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  return s;
}
