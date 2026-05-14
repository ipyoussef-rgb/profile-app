import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, serverError, unauthorized } from "@/lib/http";
import { getUserFromIdp, KobilIdpNotConfiguredError, readIdpAttribute } from "@/lib/kobil-idp";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const idp = await getUserFromIdp(user.sub);
    if (!idp) return json({ found: false });

    return json({
      found: true,
      prefill: {
        first_name: idp.firstName ?? readIdpAttribute(idp, "firstName", "given_name") ?? null,
        last_name: idp.lastName ?? readIdpAttribute(idp, "lastName", "family_name") ?? null,
        email: idp.email ?? null,
        email_verified: idp.emailVerified ?? null,
        phone: readIdpAttribute(idp, "phone", "phone_number", "phoneNumber") ?? null,
        locale: readIdpAttribute(idp, "locale") ?? null,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    if (err instanceof KobilIdpNotConfiguredError)
      return json({ found: false, configured: false }, { status: 200 });
    logEvent("error", "idp_refresh_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
