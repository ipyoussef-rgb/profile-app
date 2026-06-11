"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { upsertProfile } from "@/lib/profile-service";

export type PostfachResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  postfach_email: z.string().trim().toLowerCase().email().max(255),
});

export async function savePostfachAction(formData: FormData): Promise<PostfachResult> {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof UnauthorizedError) return { ok: false, error: `unauthorized:${e.reason}` };
    return { ok: false, error: "unauthorized" };
  }

  const parsed = schema.safeParse({ postfach_email: formData.get("postfach_email") ?? "" });
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  await upsertProfile(user.sub, { postfach_email: parsed.data.postfach_email });
  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_update",
    changed_fields: ["postfach_email"],
  });
  revalidatePath("/profile/postfach");
  revalidatePath("/profile");
  return { ok: true };
}
