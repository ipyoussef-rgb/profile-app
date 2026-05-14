"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { upsertProfile } from "@/lib/profile-service";
import {
  birthdateIsoToKobil,
  FORBIDDEN_PROFILE_KEYS,
  idpProfileUpdateSchema,
  profileUpdateSchema,
} from "@/lib/schemas/profile";
import {
  KobilIdpNotConfiguredError,
  updateUserInIdp,
} from "@/lib/kobil-idp";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/* App-profile save (display_name, avatar_url, profile_visibility, etc.). */
export async function saveAppProfileAction(formData: FormData): Promise<SaveResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  const candidate: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(Object.fromEntries(formData.entries()))) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed === "") continue;
    candidate[k] = trimmed;
  }

  const forbidden = Object.keys(candidate).filter((k) =>
    (FORBIDDEN_PROFILE_KEYS as readonly string[]).includes(k),
  );
  if (forbidden.length > 0) {
    return {
      ok: false,
      error: "forbidden_fields",
      fieldErrors: Object.fromEntries(forbidden.map((f) => [f, "managed by KOBIL Identity"])),
    };
  }

  let patch;
  try {
    patch = profileUpdateSchema.parse(candidate);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of err.issues) fieldErrors[i.path.join(".") || "_root"] = i.message;
      return { ok: false, error: "validation", fieldErrors };
    }
    throw err;
  }

  const changed = Object.keys(patch);
  if (changed.length === 0) return { ok: true };

  await upsertProfile(user.sub, patch);
  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_update",
    changed_fields: changed,
  });
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

/* Identity save → KOBIL updateProfileUser. Only sends fields that actually
 * differ from the prefilled snapshot so we don't overwrite untouched ones. */
export async function saveIdentityAction(formData: FormData): Promise<SaveResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());
  const candidate: Record<string, unknown> = {};

  const scalars = ["first_name", "last_name", "phone", "locale", "birthdate"] as const;
  for (const k of scalars) {
    const v = raw[k];
    if (typeof v === "string" && v.trim() !== "") candidate[k] = v.trim();
  }

  const addr: Record<string, string> = {};
  for (const k of ["street", "locality", "postal_code", "country"] as const) {
    const v = raw[`address.${k}`];
    if (typeof v === "string" && v.trim() !== "") {
      addr[k] = k === "country" ? v.trim().toUpperCase() : v.trim();
    }
  }
  if (Object.keys(addr).length > 0) candidate.address = addr;

  let patch;
  try {
    patch = idpProfileUpdateSchema.parse(candidate);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of err.issues) fieldErrors[i.path.join(".") || "_root"] = i.message;
      return { ok: false, error: "validation", fieldErrors };
    }
    throw err;
  }

  if (Object.keys(patch).length === 0) return { ok: true };

  const idpPatch: Parameters<typeof updateUserInIdp>[1] = {};
  if (patch.first_name !== undefined) idpPatch.firstName = patch.first_name;
  if (patch.last_name !== undefined) idpPatch.lastName = patch.last_name;
  const attrs: Record<string, string[]> = {};
  if (patch.phone !== undefined) attrs.phone = [patch.phone];
  if (patch.locale !== undefined) attrs.locale = [patch.locale];
  if (patch.birthdate !== undefined) {
    // Form submits ISO YYYY-MM-DD; KOBIL stores DD.MM.YYYY.
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

  if (!user.email) {
    return {
      ok: false,
      error:
        "KOBIL Users API requires an email; your session has no email claim. Sign out + sign in to refresh.",
    };
  }
  try {
    await updateUserInIdp(user.email, idpPatch);
  } catch (err) {
    if (err instanceof KobilIdpNotConfiguredError) {
      return {
        ok: false,
        error:
          "KOBIL service client is not configured. Set KOBIL_SERVICE_CLIENT_ID and KOBIL_SERVICE_CLIENT_SECRET in Vercel and redeploy.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "kobil_idp_update_failed",
    };
  }

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_update",
    changed_fields: Object.keys(patch).map((k) => `idp:${k}`),
  });
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}
