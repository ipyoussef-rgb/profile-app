import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, serverError, unauthorized, unprocessable } from "@/lib/http";
import {
  KobilIdpNotConfiguredError,
  updateUserInIdp,
} from "@/lib/kobil-idp";
import { logEvent } from "@/lib/safe-log";
import { birthdateIsoToKobil, idpProfileUpdateSchema } from "@/lib/schemas/profile";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const meta = requestMetaFromHeaders(req.headers);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return unprocessable({ message: "invalid JSON" });
    }

    let patch;
    try {
      patch = idpProfileUpdateSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const i of e.issues) fieldErrors[i.path.join(".") || "_root"] = i.message;
        return unprocessable({ message: "invalid fields", fieldErrors });
      }
      throw e;
    }

    // Map snake_case → KOBIL conventions. Top-level firstName/lastName/email,
    // everything else under `attributes`.
    const idpPatch: Parameters<typeof updateUserInIdp>[1] = {};
    if (patch.first_name !== undefined) idpPatch.firstName = patch.first_name;
    if (patch.last_name !== undefined) idpPatch.lastName = patch.last_name;

    const attrs: Record<string, string[]> = {};
    if (patch.phone !== undefined) attrs.phone = [patch.phone];
    if (patch.locale !== undefined) attrs.locale = [patch.locale];
    if (patch.birthdate !== undefined) {
      const kobilDate = birthdateIsoToKobil(patch.birthdate);
      if (kobilDate) attrs.birthdate = [kobilDate];
    }
    if (patch.address) {
      if (patch.address.street !== undefined) attrs.street = [patch.address.street];
      if (patch.address.locality !== undefined) attrs.locality = [patch.address.locality];
      if (patch.address.postal_code !== undefined) attrs.postal_code = [patch.address.postal_code];
      if (patch.address.country !== undefined) attrs.country = [patch.address.country];
    }
    if (Object.keys(attrs).length > 0) idpPatch.attributes = attrs;

    if (Object.keys(idpPatch).length === 0) return json({ ok: true, changed: 0 });

    if (!user.email) {
      return json(
        { ok: false, error: "no_email_in_session" },
        { status: 400 },
      );
    }
    await updateUserInIdp(user.email, idpPatch);

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_update",
      changed_fields: Object.keys(patch).map((k) => `idp:${k}`),
      ...meta,
    });

    return json({ ok: true, changed: Object.keys(patch).length });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    if (err instanceof KobilIdpNotConfiguredError) {
      return json(
        { ok: false, error: "kobil_service_client_not_configured" },
        { status: 503 },
      );
    }
    logEvent("error", "idp_patch_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
