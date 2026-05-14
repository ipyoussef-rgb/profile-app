import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/safe-log";
import { getProvider } from "@/lib/verification/provider";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const next = req.nextUrl.searchParams.get("next") ?? "/profile/verified";

  if (!sessionId) {
    return new NextResponse("Missing session_id", { status: 400 });
  }

  const verification = await prisma.userVerification.findUnique({
    where: { session_id: sessionId },
  });
  if (!verification) {
    return new NextResponse("Unknown verification session", { status: 404 });
  }

  // Idempotency: if already in a terminal state, just redirect back.
  if (verification.status !== "pending") {
    return NextResponse.redirect(new URL(next, env().APP_BASE_URL));
  }

  const provider = getProvider();
  const result = await provider.resolveCallback(sessionId, req.nextUrl.searchParams);

  if (result.status !== "verified") {
    await prisma.userVerification.update({
      where: { session_id: sessionId },
      data: { status: result.status },
    });
    await audit({
      user_id: verification.user_id,
      actor_subject: verification.user_id,
      action: "profile_update",
      changed_fields: [`eid_verification_${result.status}:${sessionId}`],
    });
    return NextResponse.redirect(new URL(next, env().APP_BASE_URL));
  }

  // Verified path: write claims (minimum necessary) + transition verification row.
  const claims = result.claims;
  const claimRows: {
    claim_name: string;
    claim_value: string;
  }[] = [];
  if (claims.identity_verified !== undefined)
    claimRows.push({ claim_name: "identity_verified", claim_value: String(claims.identity_verified) });
  if (claims.age_over_16 !== undefined)
    claimRows.push({ claim_name: "age_over_16", claim_value: String(claims.age_over_16) });
  if (claims.age_over_18 !== undefined)
    claimRows.push({ claim_name: "age_over_18", claim_value: String(claims.age_over_18) });
  if (claims.age_over_21 !== undefined)
    claimRows.push({ claim_name: "age_over_21", claim_value: String(claims.age_over_21) });

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.userVerification.update({
        where: { session_id: sessionId },
        data: {
          status: "verified",
          assurance_level: claims.assurance_level ?? null,
          verified_at: result.verified_at,
          expires_at: result.expires_at ?? null,
        },
      });
      if (claimRows.length > 0) {
        await tx.userVerifiedClaim.createMany({
          data: claimRows.map((c) => ({
            user_id: verification.user_id,
            verification_id: updated.id,
            claim_name: c.claim_name,
            claim_value: c.claim_value,
            source: updated.method,
            assurance_level: claims.assurance_level ?? null,
            verified_at: result.verified_at,
            expires_at: result.expires_at ?? null,
          })),
        });
      }
    });

    await audit({
      user_id: verification.user_id,
      actor_subject: verification.user_id,
      action: "profile_update",
      changed_fields: [`eid_verification_completed:${sessionId}`],
    });
  } catch (err) {
    logEvent("error", "eid_callback_persist_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Internal error", { status: 500 });
  }

  return NextResponse.redirect(new URL(next, env().APP_BASE_URL));
}
