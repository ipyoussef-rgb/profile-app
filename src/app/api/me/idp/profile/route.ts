import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { audit, requestMetaFromHeaders } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, serverError, unauthorized, unprocessable } from "@/lib/http";
import {
  KobilIdpNotConfiguredError,
  updateUserInIdp,
} from "@/lib/kobil-idp";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(40).optional(),
    locale: z.string().trim().max(20).optional(),
  })
  .strict();

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
      patch = patchSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError)
        return unprocessable({ issues: e.issues.map((i) => i.message) });
      throw e;
    }

    // Translate snake_case → KOBIL's mixed conventions.
    const idpPatch: Parameters<typeof updateUserInIdp>[1] = {};
    if (patch.first_name !== undefined) idpPatch.firstName = patch.first_name;
    if (patch.last_name !== undefined) idpPatch.lastName = patch.last_name;
    const attrs: Record<string, string[]> = {};
    if (patch.phone !== undefined) attrs.phone = [patch.phone];
    if (patch.locale !== undefined) attrs.locale = [patch.locale];
    if (Object.keys(attrs).length > 0) idpPatch.attributes = attrs;

    await updateUserInIdp(user.sub, idpPatch);

    await audit({
      user_id: user.sub,
      actor_subject: user.sub,
      action: "profile_update",
      changed_fields: Object.keys(patch).map((k) => `idp:${k}`),
      ...meta,
    });

    return json({ ok: true });
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
