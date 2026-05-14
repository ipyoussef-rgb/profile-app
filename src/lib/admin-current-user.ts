import { redirect } from "next/navigation";
import { env } from "./env";
import { getAdminSession, AdminSessionPayload } from "./admin-session";

export class AdminUnauthorizedError extends Error {
  constructor(public reason: "no_session" | "missing_role") {
    super(reason);
  }
}

function hasAdminRole(s: AdminSessionPayload): boolean {
  const required = env().KOBIL_ADMIN_ROLE;
  return Array.isArray(s.roles) && s.roles.includes(required);
}

/** Used in API routes: throws AdminUnauthorizedError on missing session/role. */
export async function requireAdmin(): Promise<AdminSessionPayload> {
  const s = await getAdminSession();
  if (!s?.sub) throw new AdminUnauthorizedError("no_session");
  if (!hasAdminRole(s)) throw new AdminUnauthorizedError("missing_role");
  return s;
}

/** Used in server components / pages: redirects to admin login if no session,
 *  redirects to /access-denied (outside the admin layout) if missing the role. */
export async function requireAdminOrRedirect(returnTo = "/admin"): Promise<AdminSessionPayload> {
  const s = await getAdminSession();
  if (!s?.sub) redirect(`/api/admin/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!hasAdminRole(s)) redirect("/access-denied");
  return s;
}
