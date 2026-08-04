"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { prisma } from "@/lib/db";

type Result = { ok: boolean; error?: string };

export async function saveAttributeSelectionAction(
  catalogId: string,
  valueIds: string[],
): Promise<Result> {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: `unauthorized:${e.reason}` };
    }
    return { ok: false, error: "unauthorized" };
  }

  // Verify catalog exists + active; load valid value ids to gate the input.
  const catalog = await prisma.attributeCatalog.findUnique({
    where: { id: catalogId },
    include: { values: { where: { active: true }, select: { id: true } } },
  });
  if (!catalog || !catalog.active) return { ok: false, error: "catalog_unavailable" };

  const validIds = new Set(catalog.values.map((v) => v.id));
  const sanitized = Array.from(new Set(valueIds)).filter((id) => validIds.has(id));

  if (!catalog.multi_select && sanitized.length > 1) {
    return { ok: false, error: "single_select_violation" };
  }

  // Replace selections for this catalog in one transaction.
  await prisma.$transaction([
    prisma.userAttributeValue.deleteMany({
      where: { user_id: user.sub, catalog_id: catalogId },
    }),
    ...(sanitized.length > 0
      ? [
          prisma.userAttributeValue.createMany({
            data: sanitized.map((value_id) => ({
              user_id: user.sub,
              catalog_id: catalogId,
              value_id,
            })),
          }),
        ]
      : []),
  ]);

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "profile_update",
    changed_fields: [`attributes:${catalog.slug}`],
  });

  revalidatePath("/profile/attributes");
  revalidatePath("/profile");
  return { ok: true };
}
