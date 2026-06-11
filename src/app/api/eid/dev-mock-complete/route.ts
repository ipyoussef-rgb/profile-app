import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { attributesToDbColumns, eidEnabled } from "@/lib/eid";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** DEV-ONLY: simulates a successful eID-Server callback. Enabled when
 *  EID_ENABLED=1 AND EID_DEV_MOCK=1. Lets the UI flow be tested end-to-end
 *  without a real Berechtigungszertifikat. Fills in the canonical test-PA
 *  values. */
export async function POST() {
  if (!eidEnabled() || !env().EID_DEV_MOCK) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cols = attributesToDbColumns({
    GivenNames: "ERIKA",
    FamilyNames: "MUSTERMANN",
    DateOfBirth: "12.08.1964",
    PlaceOfBirth: "BERLIN",
    PlaceOfResidence: {
      Street: "HEIDESTRASSE 17",
      City: "KÖLN",
      ZipCode: "51147",
      Country: "D",
    },
  });

  await prisma.eidVerification.upsert({
    where: { user_id: user.sub },
    create: { user_id: user.sub, transaction_id: "dev-mock", ...cols },
    update: { verified_at: new Date(), transaction_id: "dev-mock", ...cols },
  });

  await audit({
    user_id: user.sub,
    actor_subject: user.sub,
    action: "eid_verified",
    changed_fields: ["eid:given_names", "eid:family_names", "eid:date_of_birth", "eid:place_of_birth", "eid:street", "eid:city", "eid:zip_code", "eid:country"],
  });

  return NextResponse.json({ ok: true });
}
