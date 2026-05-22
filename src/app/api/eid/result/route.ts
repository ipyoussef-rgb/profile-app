import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { attributesToDbColumns, verifyEidSession, type EidResultAttributes } from "@/lib/eid";

export const dynamic = "force-dynamic";

/** Webhook hit by the eID-Server (Governikus Test-PP / production) when the
 *  PAOS exchange completes and verified attributes are available.
 *
 *  IMPORTANT — production hardening missing:
 *   - This endpoint MUST authenticate the eID-Server (mTLS or shared secret).
 *     Currently it accepts any POST that carries a valid sid. Sufficient for
 *     dev; before going live, add an HMAC header or mTLS check here.
 *
 *  Body shape:
 *    { sid: string, transactionId?: string, attributes: EidResultAttributes }
 */
export async function POST(req: NextRequest) {
  let body: {
    sid?: string;
    transactionId?: string;
    attributes?: EidResultAttributes;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body.sid || !body.attributes) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  const session = await verifyEidSession(body.sid);
  if (!session) {
    return NextResponse.json({ ok: false, error: "invalid_sid" }, { status: 400 });
  }

  const cols = attributesToDbColumns(body.attributes);

  await prisma.eidVerification.upsert({
    where: { user_id: session.sub },
    create: {
      user_id: session.sub,
      transaction_id: body.transactionId ?? null,
      ...cols,
    },
    update: {
      verified_at: new Date(),
      transaction_id: body.transactionId ?? null,
      ...cols,
    },
  });

  await audit({
    user_id: session.sub,
    actor_subject: session.sub,
    action: "eid_verified",
    changed_fields: Object.entries(cols)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k]) => `eid:${k}`),
  });

  return NextResponse.json({ ok: true });
}
