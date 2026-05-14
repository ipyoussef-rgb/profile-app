import { requireUser, UnauthorizedError } from "@/lib/current-user";
import { json, serverError, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/safe-log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();

    // Latest verified eID + latest age proofs per threshold.
    const [eid, ageClaims] = await Promise.all([
      prisma.userVerification.findFirst({
        where: { user_id: user.sub, verification_type: "eid", status: "verified" },
        orderBy: { verified_at: "desc" },
      }),
      prisma.userVerifiedClaim.findMany({
        where: {
          user_id: user.sub,
          claim_name: { in: ["age_over_16", "age_over_18", "age_over_21"] },
        },
        orderBy: { verified_at: "desc" },
      }),
    ]);

    const ageMap = new Map<string, (typeof ageClaims)[number]>();
    for (const c of ageClaims) {
      const existing = ageMap.get(c.claim_name);
      if (!existing) ageMap.set(c.claim_name, c);
    }

    const identityStatus = eid
      ? {
          status: eid.status,
          method: eid.method,
          assurance_level: eid.assurance_level,
          verified_at: eid.verified_at,
          expires_at: eid.expires_at,
        }
      : { status: "not_verified" as const };

    const age = (["age_over_16", "age_over_18", "age_over_21"] as const).map((n) => {
      const c = ageMap.get(n);
      if (!c) return { claim: n, verified: false } as const;
      return {
        claim: n,
        verified: c.claim_value === "true",
        method: c.source,
        assurance_level: c.assurance_level,
        verified_at: c.verified_at,
        expires_at: c.expires_at,
      } as const;
    });

    return json({ identity: identityStatus, age });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    logEvent("error", "verifications_get_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError();
  }
}
