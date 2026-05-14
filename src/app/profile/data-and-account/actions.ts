"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function requestDeletionAction(): Promise<{ ok: boolean; error?: string }> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUnique({ where: { user_id: user.sub } });
    if (existing) {
      await tx.profile.update({
        where: { user_id: user.sub },
        data: {
          display_name: null,
          avatar_url: null,
          profile_visibility: "private",
          notification_preferences: Prisma.DbNull,
          privacy_settings: Prisma.DbNull,
          deletion_requested_at: new Date(),
          anonymized_at: new Date(),
        },
      });
    } else {
      await tx.profile.create({
        data: {
          user_id: user.sub,
          profile_visibility: "private",
          deletion_requested_at: new Date(),
          anonymized_at: new Date(),
        },
      });
    }
    await tx.privacyRequest.create({
      data: { user_id: user.sub, request_type: "deletion", status: "received" },
    });
  });

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_deletion_requested",
  });

  revalidatePath("/profile");
  revalidatePath("/profile/data-and-account");
  return { ok: true };
}
