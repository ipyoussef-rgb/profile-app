"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { upsertProfile } from "@/lib/profile-service";
import { FORBIDDEN_PROFILE_KEYS, profileUpdateSchema } from "@/lib/schemas/profile";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveProfileAction(formData: FormData): Promise<SaveResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  const raw = Object.fromEntries(formData.entries());

  // Coerce / shape form data into the schema shape. Empty strings → omit field.
  const candidate: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed === "") continue;
    candidate[k] = trimmed;
  }

  // Build a nested `address` object if any address subfields are present.
  const addr: Record<string, string> = {};
  for (const key of ["street", "locality", "postal_code", "country"] as const) {
    if (typeof candidate[`address.${key}`] === "string") {
      addr[key] = candidate[`address.${key}`] as string;
      delete candidate[`address.${key}`];
    }
  }
  if (Object.keys(addr).length > 0) candidate["address"] = addr;

  // Reject KOBIL-Identity-owned / verified-claim keys before zod runs.
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
      for (const i of err.issues) {
        fieldErrors[i.path.join(".") || "_root"] = i.message;
      }
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
