"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  CONSENT_PURPOSES,
  ConsentPurpose,
  LEGAL_BASIS,
} from "@/lib/schemas/consents";

export async function toggleConsentAction(
  purpose: ConsentPurpose,
  granted: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!(CONSENT_PURPOSES as readonly string[]).includes(purpose)) {
    return { ok: false, error: "invalid_purpose" };
  }
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "unauthorized" };
  }

  await prisma.userConsent.create({
    data: {
      user_id: user.sub,
      purpose,
      legal_basis: LEGAL_BASIS[purpose],
      granted,
      notice_version: env().PRIVACY_NOTICE_VERSION,
      source: "user",
      withdrawn_at: granted ? null : new Date(),
    },
  });

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "consent_updated",
    changed_fields: [`${purpose}=${granted}`],
  });

  revalidatePath("/profile/privacy");
  return { ok: true };
}
